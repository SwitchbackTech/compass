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
import {
  clearAppLockReasons,
  isAppLocked,
  setAppLockReason,
} from "@web/shortcuts/app-lock";
import { setPinnedTimeZone } from "@web/timezone/effective-timezone.store";
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
  setPinnedTimeZone(null);
  clearAppLockReasons();
});

const writableCalendar = createMockCalendar({
  id: CalendarIdSchema.parse(createObjectIdString()),
  name: "Work",
  accountEmail: "host@example.com",
});

const bookingPageUrl = `${ENV_WEB.API_BASEURL}/booking/page`;

const HOST_TIME_ZONE = "America/Chicago";

const unconfiguredPage = () => ({
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
  isConfigured: false,
});

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

  it("saves again after the first save, sending only PUT input keys", async () => {
    const user = userEvent.setup({ delay: null });
    const slug = "hostuser";
    const bookingUrl = `https://compasscalendar.com/book/${slug}`;
    const savedBodies: Record<string, unknown>[] = [];

    userMetadataActions.set(healthyGoogleMetadata);

    // The saved-page shape, which is what GET really returns once a slug
    // exists. Seeding the form from this used to poison every later save:
    // the response-only keys rode along into the strict PUT schema.
    const savedPage = {
      id: createObjectIdString(),
      slug,
      hostUserId: createObjectIdString(),
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
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      bookingUrl,
    };

    server.use(
      rest.get(bookingPageUrl, (_req, res, ctx) => res(ctx.json(savedPage))),
      rest.put(bookingPageUrl, async (req, res, ctx) => {
        const body = (await req.json()) as Record<string, unknown>;
        savedBodies.push(body);
        return res(ctx.json({ ...savedPage, ...body }));
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
      expect(savedBodies).toHaveLength(1);
    });

    await user.selectOptions(screen.getByLabelText("Duration"), "15");
    await user.click(
      screen.getByRole("button", { name: "Save booking settings" }),
    );

    await waitFor(() => {
      expect(savedBodies).toHaveLength(2);
    });
    expect(savedBodies[1]).toMatchObject({ durationMinutes: 15 });
    expect(Object.keys(savedBodies[1] ?? {}).sort()).toEqual([
      "blockingCalendarIds",
      "bufferMinutes",
      "destinationCalendarId",
      "durationMinutes",
      "enabled",
      "guestsCanInviteOthers",
      "maxBookingsPerDay",
      "maxHorizonDays",
      "minNoticeHours",
      "timeZone",
      "weeklyAvailability",
    ]);
  });

  it("seeds the booking timezone from the user's zone when never configured", async () => {
    userMetadataActions.set(healthyGoogleMetadata);
    // Pinned rather than relying on the browser zone: CI runs at TZ=UTC, where
    // a browser-zone assertion would pass even against the "UTC" placeholder.
    setPinnedTimeZone(HOST_TIME_ZONE);

    server.use(
      rest.get(bookingPageUrl, (_req, res, ctx) =>
        res(
          ctx.json({
            enabled: false,
            durationMinutes: 30,
            destinationCalendarId: writableCalendar.id,
            blockingCalendarIds: [writableCalendar.id],
            // The server placeholder: it has no user timezone to offer.
            timeZone: "UTC",
            weeklyAvailability: [],
            minNoticeHours: 4,
            maxHorizonDays: 60,
            bufferMinutes: null,
            maxBookingsPerDay: null,
            guestsCanInviteOthers: true,
            isConfigured: false,
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

    const trigger = await screen.findByRole("button", {
      name: /^Booking timezone:/,
    });
    expect(trigger).toHaveAccessibleName("Booking timezone: Chicago (CDT)");
  });

  it("keeps a configured page's stored timezone even when it is UTC", async () => {
    userMetadataActions.set(healthyGoogleMetadata);
    setPinnedTimeZone(HOST_TIME_ZONE);

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
            // Saved, never enabled. UTC here is a deliberate choice.
            isConfigured: true,
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

    const trigger = await screen.findByRole("button", {
      name: /^Booking timezone:/,
    });
    expect(trigger).toHaveAccessibleName("Booking timezone: UTC (UTC)");
  });

  it("jumps to a field with the e leader, under the Settings app lock", async () => {
    const user = userEvent.setup({ delay: null });
    userMetadataActions.set(healthyGoogleMetadata);
    // The Settings modal holds the lock in the real app, and the leader must
    // still work underneath it - that is exactly what ignoreAppLock buys.
    setAppLockReason("settingsModal", true);

    server.use(
      rest.get(bookingPageUrl, (_req, res, ctx) =>
        res(ctx.json(unconfiguredPage())),
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
    expect(isAppLocked()).toBe(true);

    await user.keyboard("e");
    await user.keyboard("h");

    expect(document.activeElement).toBe(screen.getByLabelText("Monday"));
  });

  it("jumps to the timezone trigger with e then z", async () => {
    const user = userEvent.setup({ delay: null });
    userMetadataActions.set(healthyGoogleMetadata);

    server.use(
      rest.get(bookingPageUrl, (_req, res, ctx) =>
        res(ctx.json(unconfiguredPage())),
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

    await user.keyboard("e");
    await user.keyboard("z");

    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: /^Booking timezone:/ }),
    );
  });

  it("blocks the save while a weekly-hours row cannot be read", async () => {
    const user = userEvent.setup({ delay: null });
    userMetadataActions.set(healthyGoogleMetadata);
    let putCount = 0;

    server.use(
      rest.get(bookingPageUrl, (_req, res, ctx) =>
        res(ctx.json(unconfiguredPage())),
      ),
      rest.put(bookingPageUrl, async (req, res, ctx) => {
        putCount += 1;
        return res(ctx.json(await req.json()));
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

    await user.type(screen.getByLabelText("Monday"), "whenever");
    await user.tab();
    await user.click(
      screen.getByRole("button", { name: "Save booking settings" }),
    );

    expect(putCount).toBe(0);
    expect(
      screen.getByText("Fix the weekly hours that could not be read."),
    ).toBeInTheDocument();
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
