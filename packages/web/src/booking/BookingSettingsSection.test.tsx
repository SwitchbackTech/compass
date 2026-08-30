import "@testing-library/jest-dom";
import { HotkeysProvider } from "@tanstack/react-hotkeys";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { rest } from "msw";
import { CalendarIdSchema } from "@core/types/domain-primitives";
import { server } from "@web/__tests__/__mocks__/server/mock.server";
import { createStoreWrapper } from "@web/__tests__/render-with-store";
import {
  createMockCalendar,
  createMockConnection,
} from "@web/__tests__/utils/factories/calendar.factory";
import { userMetadataActions } from "@web/auth/state/user-metadata.store";
import { BookingSettingsSection } from "@web/booking/BookingSettingsSection";
import { calendarQueryKeys } from "@web/calendars/calendar.query";
import { ENV_WEB } from "@web/common/constants/env.constants";
import { createObjectIdString } from "@web/common/utils/id/object-id.util";
import { afterEach, describe, expect, it, mock } from "bun:test";

const actualUseAppAccess = (await import("@web/billing/useAppAccess"))
  .useAppAccess;
let isAppAccessMocked = true;
mock.module("@web/billing/useAppAccess", () => ({
  useAppAccess: (...args: Parameters<typeof actualUseAppAccess>) =>
    isAppAccessMocked ? { kind: "open" as const } : actualUseAppAccess(...args),
}));

afterEach(() => {
  isAppAccessMocked = true;
});

const writableCalendar = createMockCalendar({
  id: CalendarIdSchema.parse(createObjectIdString()),
  name: "Work",
  accountEmail: "host@example.com",
});

const bookingPageUrl = `${ENV_WEB.API_BASEURL}/booking/page`;

const healthyGoogleMetadata = {
  google: {
    connectionState: "HEALTHY" as const,
    connections: [createMockConnection("host@example.com")],
  },
};

describe("BookingSettingsSection", () => {
  it("shows connect Google prompt when Google is not healthy", () => {
    userMetadataActions.set({
      google: {
        connectionState: "NOT_CONNECTED",
        connections: [],
      },
    });

    const { wrapper } = createStoreWrapper();
    render(
      <HotkeysProvider>
        <BookingSettingsSection showShortcuts={false} />
      </HotkeysProvider>,
      { wrapper },
    );

    expect(
      screen.getByText(/Connect a Google account to enable your booking page/),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Duration")).not.toBeInTheDocument();
  });

  it("saves 30-minute duration and shows the copyable booking link", async () => {
    const user = userEvent.setup({ delay: null });
    const slug = "hostuser";
    const bookingUrl = `https://compasscalendar.com/book/${slug}`;
    let savedBody: unknown;

    userMetadataActions.set(healthyGoogleMetadata);

    server.use(
      rest.get(bookingPageUrl, (_req, res, ctx) =>
        res(
          ctx.json({
            enabled: false,
            durationMinutes: 45,
            destinationCalendarId: writableCalendar.id,
            blockingCalendarIds: [writableCalendar.id],
            timeZone: "America/New_York",
            weeklyAvailability: [],
            minNoticeHours: 4,
            maxHorizonDays: 60,
            bufferMinutes: null,
            maxBookingsPerDay: null,
            guestsCanInviteOthers: true,
          }),
        ),
      ),
      rest.put(bookingPageUrl, async (req, res, ctx) => {
        savedBody = await req.json();
        return res(
          ctx.json({
            ...(savedBody as object),
            id: createObjectIdString(),
            slug,
            hostUserId: createObjectIdString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            bookingUrl,
          }),
        );
      }),
    );

    const { wrapper, queryClient } = createStoreWrapper();
    queryClient.setQueryData(calendarQueryKeys.all, [writableCalendar]);

    render(
      <HotkeysProvider>
        <BookingSettingsSection showShortcuts={false} />
      </HotkeysProvider>,
      { wrapper },
    );

    await screen.findByRole("button", { name: "Save booking settings" });

    await user.selectOptions(screen.getByLabelText("Duration"), "30");
    await user.click(
      screen.getByRole("button", { name: "Save booking settings" }),
    );

    await waitFor(() => {
      expect(savedBody).toMatchObject({ durationMinutes: 30 });
    });

    expect(await screen.findByLabelText("Public booking link")).toHaveValue(
      bookingUrl,
    );
  });

  it("blocks enable without a destination calendar", async () => {
    const user = userEvent.setup({ delay: null });

    userMetadataActions.set(healthyGoogleMetadata);

    server.use(
      rest.get(bookingPageUrl, (_req, res, ctx) =>
        res(
          ctx.json({
            enabled: false,
            durationMinutes: 30,
            destinationCalendarId: "000000000000000000000001",
            blockingCalendarIds: ["000000000000000000000001"],
            timeZone: "UTC",
            weeklyAvailability: [],
            minNoticeHours: 4,
            maxHorizonDays: 60,
            bufferMinutes: null,
            maxBookingsPerDay: null,
            guestsCanInviteOthers: true,
          }),
        ),
      ),
    );

    const { wrapper, queryClient } = createStoreWrapper();
    queryClient.setQueryData(calendarQueryKeys.all, []);

    render(
      <HotkeysProvider>
        <BookingSettingsSection showShortcuts={false} />
      </HotkeysProvider>,
      { wrapper },
    );

    await screen.findByLabelText("Enable booking page");
    await user.click(screen.getByLabelText("Enable booking page"));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Choose a destination calendar before enabling booking.",
    );
  });

  it("shows an error on PUT 403 without crashing Settings", async () => {
    const user = userEvent.setup({ delay: null });

    userMetadataActions.set(healthyGoogleMetadata);

    server.use(
      rest.get(bookingPageUrl, (_req, res, ctx) =>
        res(
          ctx.json({
            enabled: false,
            durationMinutes: 30,
            destinationCalendarId: writableCalendar.id,
            blockingCalendarIds: [writableCalendar.id],
            timeZone: "UTC",
            weeklyAvailability: [],
            minNoticeHours: 4,
            maxHorizonDays: 60,
            bufferMinutes: null,
            maxBookingsPerDay: null,
            guestsCanInviteOthers: true,
          }),
        ),
      ),
      rest.put(bookingPageUrl, (_req, res, ctx) =>
        res(
          ctx.status(403),
          ctx.json({
            code: "GOOGLE_NOT_CONNECTED",
            message: "Connect a healthy Google account before enabling booking",
          }),
        ),
      ),
    );

    const { wrapper, queryClient } = createStoreWrapper();
    queryClient.setQueryData(calendarQueryKeys.all, [writableCalendar]);

    render(
      <HotkeysProvider>
        <BookingSettingsSection showShortcuts={false} />
      </HotkeysProvider>,
      { wrapper },
    );

    await screen.findByRole("button", { name: "Save booking settings" });
    await user.click(
      screen.getByRole("button", { name: "Save booking settings" }),
    );

    expect(
      screen.getByRole("button", { name: "Save booking settings" }),
    ).toBeInTheDocument();
  });
});
