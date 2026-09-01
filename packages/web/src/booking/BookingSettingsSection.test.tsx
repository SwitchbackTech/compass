import "@testing-library/jest-dom";
import { HotkeysProvider, resolveModifier } from "@tanstack/react-hotkeys";
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
import { pressKey } from "@web/__tests__/utils/keyboard.test.util";
import { userMetadataActions } from "@web/auth/state/user-metadata.store";
import { BookingSettingsSection } from "@web/booking/BookingSettingsSection";
import {
  BOOKING_FIELD_BY_KEY,
  BOOKING_SEQUENCE_FIELDS,
  bookingFieldAttrs,
  bookingFieldKey,
  focusBookingField,
} from "@web/booking/booking-sequence.fields";
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
  setClipboard(originalClipboard);
});

const writableCalendar = createMockCalendar({
  id: CalendarIdSchema.parse(createObjectIdString()),
  name: "Work",
  accountEmail: "host@example.com",
});

const bookingPageUrl = `${ENV_WEB.API_BASEURL}/booking/page`;

const HOST_TIME_ZONE = "America/Chicago";

const originalClipboard = navigator.clipboard;
const setClipboard = (value: unknown) => {
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value,
    writable: true,
  });
};

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

    const save = await screen.findByRole("button", {
      name: "Save booking settings",
    });
    expect(save.parentElement?.parentElement?.className).toContain("sticky");

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
    const openLink = screen.getByRole("link", { name: "Open booking page" });
    expect(openLink).toHaveAttribute("href", bookingUrl);
    expect(openLink).toHaveAttribute("target", "_blank");
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
      "dateOverrides",
      "destinationCalendarId",
      "durationMinutes",
      "enabled",
      "guestsCanInviteOthers",
      "maxBookingsPerDay",
      "maxHorizonDays",
      "minNoticeHours",
      "timeZone",
      "weeklyAvailability",
      "welcomeText",
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

  it("jumps to welcome text with e then w", async () => {
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
    await user.keyboard("w");

    expect(document.activeElement).toBe(screen.getByLabelText("Welcome text"));
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

  it("does not jump out of the nested timezone dialog", async () => {
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

    await user.click(
      screen.getByRole("button", { name: /^Booking timezone:/ }),
    );
    const search = await screen.findByRole("combobox", {
      name: "Search booking timezones",
    });
    await waitFor(() => expect(search).toHaveFocus());

    // Mod+E is the in-field leader; ignoreAppLock would otherwise arm it
    // here and jump to Monday behind the dialog.
    const modInit: KeyboardEventInit =
      resolveModifier("Mod") === "Meta" ? { metaKey: true } : { ctrlKey: true };
    pressKey("e", { keyDownInit: modInit, keyUpInit: modInit }, search);
    pressKey("h", {}, search);

    expect(search).toHaveFocus();
    expect(
      screen.getByRole("combobox", { name: "Search booking timezones" }),
    ).toBeInTheDocument();
  });

  it("does not arm the leader while the caret is in a field", async () => {
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

    // "9-5, then 11-2" is not real input, but any typed letter would be: a
    // bare `e` must reach the field, not swallow the next keystroke.
    const monday = screen.getByLabelText("Monday");
    await user.click(monday);
    await user.keyboard("eh");

    expect(monday).toHaveValue("eh");
    expect(document.activeElement).toBe(monday);
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

  it("saves welcome text and a blocked date override", async () => {
    const user = userEvent.setup({ delay: null });
    userMetadataActions.set(healthyGoogleMetadata);
    let savedBody: unknown;

    server.use(
      rest.get(bookingPageUrl, (_req, res, ctx) =>
        res(ctx.json(unconfiguredPage())),
      ),
      rest.put(bookingPageUrl, async (req, res, ctx) => {
        savedBody = await req.json();
        return res(ctx.json(savedBody));
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

    await user.type(
      screen.getByLabelText("Welcome text"),
      "30 minutes to talk through Compass.",
    );
    await user.click(screen.getByRole("button", { name: "Add date override" }));
    await user.type(screen.getByLabelText("Override date"), "2026-09-07");

    await user.click(
      screen.getByRole("button", { name: "Save booking settings" }),
    );

    await waitFor(() => {
      expect(savedBody).toMatchObject({
        welcomeText: "30 minutes to talk through Compass.",
        dateOverrides: [{ kind: "blocked", date: "2026-09-07" }],
      });
    });
  });

  it("blocks the save while extra hours on a date override cannot be read", async () => {
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

    await user.click(screen.getByRole("button", { name: "Add date override" }));
    await user.type(screen.getByLabelText("Override date"), "2026-09-12");
    await user.selectOptions(screen.getByLabelText("Override kind"), "hours");

    await user.click(
      screen.getByRole("button", { name: "Save booking settings" }),
    );

    expect(putCount).toBe(0);
    expect(
      screen.getByText("Fix the date overrides that could not be read."),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Check override dates and hours. Extra hours cannot be blank.",
      ),
    ).toBeInTheDocument();
  });

  it("copies the booking link after a save that returns one", async () => {
    const user = userEvent.setup({ delay: null });
    userMetadataActions.set(healthyGoogleMetadata);
    const slug = "hostuser";
    const bookingUrl = `https://compasscalendar.com/book/${slug}`;
    const writeText = mock(() => Promise.resolve());
    setClipboard({ writeText });

    server.use(
      rest.get(bookingPageUrl, (_req, res, ctx) =>
        res(ctx.json(unconfiguredPage())),
      ),
      rest.put(bookingPageUrl, async (req, res, ctx) =>
        res(
          ctx.json({
            ...((await req.json()) as Record<string, unknown>),
            id: createObjectIdString(),
            slug,
            hostUserId: createObjectIdString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            bookingUrl,
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

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(bookingUrl);
    });
  });

  it("does not claim a copy when the page has no link yet", async () => {
    const user = userEvent.setup({ delay: null });
    userMetadataActions.set(healthyGoogleMetadata);
    const writeText = mock(() => Promise.resolve());
    setClipboard({ writeText });
    let putCount = 0;

    server.use(
      rest.get(bookingPageUrl, (_req, res, ctx) =>
        res(ctx.json(unconfiguredPage())),
      ),
      // Saving while disabled allocates no slug, so the response carries no
      // bookingUrl and there is nothing to copy.
      rest.put(bookingPageUrl, async (req, res, ctx) => {
        putCount += 1;
        const body = (await req.json()) as Record<string, unknown>;
        return res(ctx.json({ ...body, isConfigured: true }));
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

    await user.click(
      screen.getByRole("button", { name: "Save booking settings" }),
    );

    await waitFor(() => {
      expect(putCount).toBe(1);
    });
    expect(writeText).not.toHaveBeenCalled();
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

  it("shows an inline error for a cleared horizon field and blocks save", async () => {
    const user = userEvent.setup({ delay: null });
    let savedBody: unknown;

    userMetadataActions.set(healthyGoogleMetadata);
    server.use(
      rest.get(bookingPageUrl, (_req, res, ctx) =>
        res(ctx.json(unconfiguredPage())),
      ),
      rest.put(bookingPageUrl, async (req, res, ctx) => {
        savedBody = await req.json();
        return res(ctx.json({ ...(savedBody as object), isConfigured: true }));
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

    const horizon = await screen.findByLabelText("Maximum horizon (days)");
    await user.clear(horizon);

    expect(screen.getByText("Enter 1 to 60 days.")).toBeInTheDocument();
    expect(horizon).toHaveAttribute("aria-invalid", "true");

    await user.click(
      screen.getByRole("button", { name: "Save booking settings" }),
    );
    expect(
      screen.getByText("Fix the highlighted number fields before saving."),
    ).toBeInTheDocument();
    expect(savedBody).toBeUndefined();

    await user.type(horizon, "30");
    expect(screen.queryByText("Enter 1 to 60 days.")).not.toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Save booking settings" }),
    );
    await waitFor(() => {
      expect(savedBody).toMatchObject({ maxHorizonDays: 30 });
    });
  });
});

describe("BOOKING_SEQUENCE_FIELDS", () => {
  it("assigns every field a unique key", () => {
    const keys = BOOKING_SEQUENCE_FIELDS.map((entry) => entry.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("leaves Settings' own booking-page keys alone", () => {
    // Settings owns bare `s` for Save on this page. Digits are nav.
    const keys = BOOKING_SEQUENCE_FIELDS.map((entry) => entry.key);
    expect(keys).not.toContain("s");
    for (const key of keys) expect(key).not.toMatch(/^\d$/);
  });

  it("maps every key back to its field", () => {
    for (const { key, field } of BOOKING_SEQUENCE_FIELDS) {
      expect(BOOKING_FIELD_BY_KEY[key]).toBe(field);
      expect(bookingFieldKey(field)).toBe(key);
    }
  });
});

describe("focusBookingField", () => {
  it("focuses the control inside a tagged wrapper", () => {
    const wrapper = document.createElement("div");
    wrapper.setAttribute(
      Object.keys(bookingFieldAttrs("hours"))[0] as string,
      "hours",
    );
    const input = document.createElement("input");
    wrapper.append(input);
    document.body.append(wrapper);

    expect(focusBookingField("hours")).toBe(true);
    expect(document.activeElement).toBe(input);
  });

  it("focuses a tagged control directly", () => {
    const select = document.createElement("select");
    select.setAttribute("data-booking-field", "duration");
    document.body.append(select);

    expect(focusBookingField("duration")).toBe(true);
    expect(document.activeElement).toBe(select);
  });

  it("focuses rather than clicks, so a checkbox is not toggled", () => {
    // The Settings idiom clicks its targets; that would flip these on the way
    // past, which is why this has its own focus-only helper.
    const label = document.createElement("label");
    label.setAttribute("data-booking-field", "enabled");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    label.append(checkbox);
    document.body.append(label);

    expect(focusBookingField("enabled")).toBe(true);
    expect(document.activeElement).toBe(checkbox);
    expect(checkbox.checked).toBe(false);
  });

  it("reports false when the field is not rendered", () => {
    expect(focusBookingField("link")).toBe(false);
  });
});
