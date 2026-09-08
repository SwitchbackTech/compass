import "@testing-library/jest-dom";
import { HotkeysProvider, resolveModifier } from "@tanstack/react-hotkeys";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { rest } from "msw";
import { DEFAULT_WEEKLY_AVAILABILITY } from "@core/types/booking.contracts";
import { CalendarIdSchema } from "@core/types/domain-primitives";
import { server } from "@web/__tests__/__mocks__/server/mock.server";
import { createTestToastPort } from "@web/__tests__/helpers/web-test-seams";
import { createStoreWrapper } from "@web/__tests__/render-with-store";
import {
  createMockCalendar,
  createMockConnection,
} from "@web/__tests__/utils/factories/calendar.factory";
import { CONNECT_CALENDAR_LABEL } from "@web/auth/providers/provider-copy.util";
import {
  resetProviderAvailabilityForTests,
  setProviderAvailabilityForTests,
} from "@web/auth/providers/useIsProviderAvailable";
import { userMetadataActions } from "@web/auth/state/user-metadata.store";
import { BOOKING_ADDRESS_CHANGE_WARNING } from "@web/booking/BookingAddressField";
import { BOOKING_CONNECT_EMPTY_ENV_COPY } from "@web/booking/BookingConnectPrompt";
import { BOOKING_MORE_OPTIONS_LABEL } from "@web/booking/BookingMoreOptions";
import { BOOKING_SAVE_CHANGES_LABEL } from "@web/booking/BookingSaveBar";
import { BookingSettingsSection } from "@web/booking/BookingSettingsSection";
import { BOOKING_SAVE_ERROR_COPY } from "@web/booking/booking.query";
import { BOOKING_APPLE_DESTINATION_HINT } from "@web/booking/booking-conference.copy";
import {
  bookingFieldAttrs,
  focusBookingField,
} from "@web/booking/booking-sequence.fields";
import { calendarQueryKeys } from "@web/calendars/calendar.query";
import { ENV_WEB } from "@web/common/constants/env.constants";
import { createObjectIdString } from "@web/common/utils/id/object-id.util";
import {
  registerToastPort,
  resetToastPort,
} from "@web/common/utils/toast/toast.port";
import { useSettingsShortcuts } from "@web/settings/useSettingsShortcuts";
import { clearAppLockReasons } from "@web/shortcuts/app-lock";
import { setPinnedTimeZone } from "@web/timezone/effective-timezone.store";
import { afterAll, afterEach, describe, expect, it, mock } from "bun:test";

const actualUseAppAccess = (await import("@web/billing/useAppAccess"))
  .useAppAccess;
let isAppAccessMocked = true;
mock.module("@web/billing/useAppAccess", () => ({
  useAppAccess: (...args: Parameters<typeof actualUseAppAccess>) =>
    isAppAccessMocked ? { kind: "open" as const } : actualUseAppAccess(...args),
}));

const mockTrack = mock();
const actualTrack = { ...(await import("@web/auth/posthog/track")) };
let isTrackMocked = true;
mock.module("@web/auth/posthog/track", () => ({
  ...actualTrack,
  track: (...args: Parameters<typeof actualTrack.track>) =>
    isTrackMocked ? mockTrack(...args) : actualTrack.track(...args),
}));

afterAll(() => {
  isTrackMocked = false;
});

afterEach(() => {
  isAppAccessMocked = true;
  mockTrack.mockClear();
  setPinnedTimeZone(null);
  clearAppLockReasons();
  setClipboard(originalClipboard);
  resetToastPort();
  resetProviderAvailabilityForTests();
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
  weeklyAvailability: DEFAULT_WEEKLY_AVAILABILITY,
  minNoticeHours: 4,
  maxHorizonDays: 60,
  bufferMinutes: null,
  maxBookingsPerDay: null,
  guestsCanInviteOthers: true,
  isConfigured: false,
  suggestedSlug: "hostuser",
});

const savedOffPage = () => ({
  enabled: false,
  durationMinutes: 30,
  destinationCalendarId: writableCalendar.id,
  blockingCalendarIds: [writableCalendar.id],
  timeZone: "UTC",
  weeklyAvailability: DEFAULT_WEEKLY_AVAILABILITY,
  minNoticeHours: 4,
  maxHorizonDays: 60,
  bufferMinutes: null,
  maxBookingsPerDay: null,
  guestsCanInviteOthers: true,
  id: createObjectIdString(),
  slug: "hostuser",
  hostUserId: createObjectIdString(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  bookingUrl: "https://compasscalendar.com/meet/hostuser",
});

const healthyGoogleMetadata = {
  google: {
    connectionState: "HEALTHY" as const,
    connections: [createMockConnection("host@example.com")],
  },
};

function BookingSettingsWithShortcuts({
  showShortcuts = false,
}: {
  showShortcuts?: boolean;
}) {
  useSettingsShortcuts({
    enabled: true,
    hasBilling: false,
    hasBooking: true,
    page: "booking",
  });
  return <BookingSettingsSection showShortcuts={showShortcuts} />;
}

function findStickyAncestor(element: HTMLElement): HTMLElement | null {
  let current: HTMLElement | null = element;
  while (current) {
    const className = current.getAttribute("class") ?? "";
    if (className.split(/\s+/).includes("sticky")) {
      return current;
    }
    current = current.parentElement;
  }
  return null;
}

function dispatchModKey(target: HTMLElement, key: string) {
  const modifierKey = resolveModifier("Mod");
  const isControl = modifierKey === "Control";
  target.dispatchEvent(
    new KeyboardEvent("keydown", {
      bubbles: true,
      cancelable: true,
      composed: true,
      ctrlKey: isControl,
      key,
      metaKey: !isControl,
    }),
  );
}

describe("BookingSettingsSection", () => {
  it("shows a connect prompt when no healthy connection exists", () => {
    setProviderAvailabilityForTests("google", "available", "connect");
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
      screen.getByText(/Connect a Google account to enable your meeting page/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: CONNECT_CALENDAR_LABEL.google }),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Duration")).not.toBeInTheDocument();
  });

  it("shows provider-neutral empty-env copy when no connect provider is configured", () => {
    setProviderAvailabilityForTests("google", "unavailable", "connect");
    setProviderAvailabilityForTests("microsoft", "unavailable", "connect");
    setProviderAvailabilityForTests("apple", "unavailable", "connect");
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
      screen.getByText(BOOKING_CONNECT_EMPTY_ENV_COPY),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("shows booking settings when a healthy non-google connection exists", async () => {
    userMetadataActions.set({
      google: {
        connectionState: "NOT_CONNECTED",
        connections: [],
      },
      connections: [
        createMockConnection("user@outlook.com", { provider: "microsoft" }),
      ],
    });

    server.use(
      rest.get(bookingPageUrl, (_req, res, ctx) =>
        res(
          ctx.json({
            ...savedOffPage(),
            destinationCalendarId: writableCalendar.id,
            blockingCalendarIds: [writableCalendar.id],
          }),
        ),
      ),
    );

    const { wrapper, queryClient } = createStoreWrapper();
    queryClient.setQueryData(calendarQueryKeys.all, [
      createMockCalendar({
        id: writableCalendar.id,
        name: writableCalendar.name,
        provider: "microsoft",
        accountEmail: "user@outlook.com",
      }),
    ]);

    render(
      <HotkeysProvider>
        <BookingSettingsSection showShortcuts={false} />
      </HotkeysProvider>,
      { wrapper },
    );

    expect(await screen.findByLabelText("Duration")).toBeInTheDocument();
    expect(
      screen.queryByText(
        /Connect a Google account to enable your meeting page/,
      ),
    ).not.toBeInTheDocument();
  });

  it("saves 30-minute duration and shows the copyable booking link", async () => {
    const user = userEvent.setup({ delay: null });
    const slug = "hostuser";
    const bookingUrl = `https://compasscalendar.com/meet/${slug}`;
    let savedBody: unknown;

    userMetadataActions.set(healthyGoogleMetadata);

    server.use(
      rest.get(bookingPageUrl, (_req, res, ctx) =>
        res(
          ctx.json({
            ...savedOffPage(),
            durationMinutes: 45,
            timeZone: "America/New_York",
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
      name: BOOKING_SAVE_CHANGES_LABEL,
    });
    const stickyBar = findStickyAncestor(save);
    expect(stickyBar).not.toBeNull();

    await user.selectOptions(screen.getByLabelText("Duration"), "30");
    await user.click(screen.getByRole("switch", { name: "Meeting page" }));

    await waitFor(() => {
      expect(savedBody).toMatchObject({
        durationMinutes: 30,
        enabled: true,
      });
    });

    expect(await screen.findByLabelText("Meeting link")).toHaveValue(
      bookingUrl,
    );
    const openLink = screen.getByRole("link", { name: "Open meeting page" });
    expect(openLink).toHaveAttribute("href", bookingUrl);
    expect(openLink).toHaveAttribute("target", "_blank");
  });

  it("saves again after the first save, sending only PUT input keys", async () => {
    const user = userEvent.setup({ delay: null });
    const slug = "hostuser";
    const bookingUrl = `https://compasscalendar.com/meet/${slug}`;
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
      weeklyAvailability: DEFAULT_WEEKLY_AVAILABILITY,
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

    await screen.findByRole("switch", { name: "Meeting page" });

    await user.selectOptions(screen.getByLabelText("Duration"), "30");
    await user.click(
      screen.getByRole("button", { name: BOOKING_SAVE_CHANGES_LABEL }),
    );
    await waitFor(() => {
      expect(savedBodies).toHaveLength(1);
    });

    await user.selectOptions(screen.getByLabelText("Duration"), "15");
    await user.click(
      screen.getByRole("button", { name: BOOKING_SAVE_CHANGES_LABEL }),
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
      "slug",
      "timeZone",
      "weeklyAvailability",
      "welcomeText",
    ]);
  });

  it("explains invite-others cancel tradeoff and RSVP-strict occupancy", async () => {
    const user = userEvent.setup({ delay: null });
    let savedBody: unknown;
    userMetadataActions.set(healthyGoogleMetadata);

    server.use(
      rest.get(bookingPageUrl, (_req, res, ctx) =>
        res(ctx.json(savedOffPage())),
      ),
      rest.put(bookingPageUrl, async (req, res, ctx) => {
        savedBody = await req.json();
        return res(
          ctx.json({
            ...(savedBody as object),
            id: createObjectIdString(),
            slug: "hostuser",
            hostUserId: createObjectIdString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            bookingUrl: "https://compasscalendar.com/meet/hostuser",
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

    expect(
      await screen.findByRole("checkbox", { name: "Guest can invite others" }),
    ).toBeChecked();
    expect(
      screen.getByText(
        "When this is on, Compass cannot put the cancel link in the calendar description. Guests keep it from the confirmation page.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Pending, maybe, and declined invites do not hold meeting times. Accepted invites and events the host organizes do.",
      ),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("switch", { name: "Meeting page" }));
    await waitFor(() => {
      expect(savedBody).toMatchObject({ guestsCanInviteOthers: true });
    });
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
            // Fallback when the host has no calendar timezone yet. Settings
            // still seeds the calendar-view zone for an unconfigured page.
            timeZone: "UTC",
            weeklyAvailability: [],
            minNoticeHours: 4,
            maxHorizonDays: 60,
            bufferMinutes: null,
            maxBookingsPerDay: null,
            guestsCanInviteOthers: true,
            isConfigured: false,
            suggestedSlug: "hostuser",
          }),
        ),
      ),
      rest.put(bookingPageUrl, async (req, res, ctx) => {
        const body = (await req.json()) as Record<string, unknown>;
        return res(
          ctx.json({
            ...body,
            id: createObjectIdString(),
            slug: body.slug,
            hostUserId: createObjectIdString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            bookingUrl: `https://compasscalendar.com/meet/${body.slug}`,
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

    await userEvent
      .setup({ delay: null })
      .click(await screen.findByRole("button", { name: "Continue" }));

    const trigger = await screen.findByRole("button", {
      name: /^Meeting timezone:/,
    });
    expect(trigger).toHaveAccessibleName("Meeting timezone: Chicago (CDT)");
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
            suggestedSlug: "hostuser",
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
      name: /^Meeting timezone:/,
    });
    expect(trigger).toHaveAccessibleName("Meeting timezone: UTC (UTC)");
  });

  it("shows the first-run address screen on an unconfigured page", async () => {
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

    expect(
      await screen.findByRole("heading", { name: "Your meeting page" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Pick the address people will use to book time with you. You can change it later.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Page address")).toHaveValue("hostuser");
    expect(
      screen.getByRole("button", { name: "Continue" }),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Duration")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("textbox", { name: /Hours/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("switch", { name: "Meeting page" }),
    ).not.toBeInTheDocument();
  });

  it("Continue PUTs a disabled draft with the typed slug and does not toast", async () => {
    const user = userEvent.setup({ delay: null });
    const { port, mocks } = createTestToastPort();
    registerToastPort(port);
    let savedBody: unknown;
    userMetadataActions.set(healthyGoogleMetadata);

    server.use(
      rest.get(bookingPageUrl, (_req, res, ctx) =>
        res(ctx.json(unconfiguredPage())),
      ),
      rest.put(bookingPageUrl, async (req, res, ctx) => {
        savedBody = await req.json();
        return res(
          ctx.json({
            ...(savedBody as object),
            id: createObjectIdString(),
            slug: (savedBody as { slug: string }).slug,
            hostUserId: createObjectIdString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            bookingUrl: `https://compasscalendar.com/meet/${(savedBody as { slug: string }).slug}`,
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

    const address = await screen.findByLabelText("Page address");
    await user.clear(address);
    await user.type(address, "my-page");
    await user.click(screen.getByRole("button", { name: /^Continue/ }));

    await waitFor(() => {
      expect(savedBody).toMatchObject({
        enabled: false,
        slug: "my-page",
        durationMinutes: 30,
        weeklyAvailability: DEFAULT_WEEKLY_AVAILABILITY,
      });
    });
    expect(mocks.toast).not.toHaveBeenCalled();
    expect(mocks.success).not.toHaveBeenCalled();
    const meetingSwitch = await screen.findByRole("switch", {
      name: "Meeting page",
    });
    expect(meetingSwitch).toHaveAttribute("aria-checked", "false");
    expect(meetingSwitch).toHaveFocus();
    expect(
      screen.getByText("Off. Turn it on to share your link."),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Your meeting page" }),
    ).not.toBeInTheDocument();
  });

  it("keeps the setup screen and shows SLUG_TAKEN under the field", async () => {
    const user = userEvent.setup({ delay: null });
    userMetadataActions.set(healthyGoogleMetadata);

    server.use(
      rest.get(bookingPageUrl, (_req, res, ctx) =>
        res(ctx.json(unconfiguredPage())),
      ),
      rest.put(bookingPageUrl, (_req, res, ctx) =>
        res(
          ctx.status(409),
          ctx.json({ code: "SLUG_TAKEN", message: "taken" }),
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

    await user.click(await screen.findByRole("button", { name: /^Continue/ }));

    expect(
      await screen.findByRole("heading", { name: "Your meeting page" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(
      BOOKING_SAVE_ERROR_COPY.SLUG_TAKEN,
    );
    expect(
      screen.queryByRole("switch", { name: "Meeting page" }),
    ).not.toBeInTheDocument();
  });

  it("blocks Continue on an invalid slug with the parse message", async () => {
    const user = userEvent.setup({ delay: null });
    let putCount = 0;
    userMetadataActions.set(healthyGoogleMetadata);

    server.use(
      rest.get(bookingPageUrl, (_req, res, ctx) =>
        res(ctx.json(unconfiguredPage())),
      ),
      rest.put(bookingPageUrl, (_req, res, ctx) => {
        putCount += 1;
        return res(ctx.status(500));
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

    const address = await screen.findByLabelText("Page address");
    await user.clear(address);
    await user.type(address, "ab");
    await user.click(screen.getByRole("button", { name: /^Continue/ }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Use 3 to 32 lowercase letters, digits, or hyphens",
    );
    expect(putCount).toBe(0);
  });

  it("Continue runs on Mod+Enter from the setup screen", async () => {
    let savedBody: unknown;
    userMetadataActions.set(healthyGoogleMetadata);

    server.use(
      rest.get(bookingPageUrl, (_req, res, ctx) =>
        res(ctx.json(unconfiguredPage())),
      ),
      rest.put(bookingPageUrl, async (req, res, ctx) => {
        savedBody = await req.json();
        return res(
          ctx.json({
            ...(savedBody as object),
            id: createObjectIdString(),
            slug: "hostuser",
            hostUserId: createObjectIdString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            bookingUrl: "https://compasscalendar.com/meet/hostuser",
          }),
        );
      }),
    );

    const { wrapper, queryClient } = createStoreWrapper();
    queryClient.setQueryData(calendarQueryKeys.all, [writableCalendar]);
    render(
      <HotkeysProvider>
        <BookingSettingsWithShortcuts />
      </HotkeysProvider>,
      { wrapper },
    );

    const address = await screen.findByLabelText("Page address");
    dispatchModKey(address, "Enter");

    await waitFor(() => {
      expect(savedBody).toMatchObject({ enabled: false, slug: "hostuser" });
    });
  });

  it("PUTs slug when the host edits the page address", async () => {
    const user = userEvent.setup({ delay: null });
    let savedBody: unknown;
    userMetadataActions.set(healthyGoogleMetadata);

    server.use(
      rest.get(bookingPageUrl, (_req, res, ctx) =>
        res(ctx.json(savedOffPage())),
      ),
      rest.put(bookingPageUrl, async (req, res, ctx) => {
        savedBody = await req.json();
        return res(
          ctx.json({
            ...(savedBody as object),
            isConfigured: true,
            suggestedSlug: "tyler-dane",
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

    const address = await screen.findByLabelText("Page address");
    expect(
      screen.queryByRole("heading", { name: "Your meeting page" }),
    ).not.toBeInTheDocument();
    await user.clear(address);
    await user.type(address, "tyler-dane");
    await user.click(
      screen.getByRole("button", { name: BOOKING_SAVE_CHANGES_LABEL }),
    );

    await waitFor(() => {
      expect(savedBody).toMatchObject({ slug: "tyler-dane" });
    });
  });

  it("blocks save on an invalid address, shows the inline error, and focuses the input", async () => {
    const user = userEvent.setup({ delay: null });
    let putCount = 0;
    userMetadataActions.set(healthyGoogleMetadata);

    server.use(
      rest.get(bookingPageUrl, (_req, res, ctx) =>
        res(ctx.json(savedOffPage())),
      ),
      rest.put(bookingPageUrl, (_req, res, ctx) => {
        putCount += 1;
        return res(ctx.status(500));
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

    const address = await screen.findByLabelText("Page address");
    await user.clear(address);
    await user.type(address, "ab");
    await user.tab();

    expect(
      screen.getByText("Use 3 to 32 lowercase letters, digits, or hyphens"),
    ).toHaveAttribute("role", "alert");
    expect(address).toHaveAttribute("aria-invalid", "true");

    await user.click(screen.getByRole("switch", { name: "Meeting page" }));
    expect(putCount).toBe(0);
    expect(document.activeElement).toBe(address);
  });

  it("renders SLUG_TAKEN inline, focuses the address, and does not toast", async () => {
    const user = userEvent.setup({ delay: null });
    const { port, mocks } = createTestToastPort();
    registerToastPort(port);
    userMetadataActions.set(healthyGoogleMetadata);

    server.use(
      rest.get(bookingPageUrl, (_req, res, ctx) =>
        res(ctx.json(savedOffPage())),
      ),
      rest.put(bookingPageUrl, (_req, res, ctx) =>
        res(
          ctx.status(409),
          ctx.json({
            code: "SLUG_TAKEN",
            message: "That address is already taken",
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

    await user.click(
      await screen.findByRole("switch", { name: "Meeting page" }),
    );

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        BOOKING_SAVE_ERROR_COPY.SLUG_TAKEN,
      );
    });
    expect(mocks.error).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(document.activeElement).toBe(
        screen.getByLabelText("Page address"),
      );
    });
  });

  it("warns when a saved address changes, not on an unconfigured page", async () => {
    const user = userEvent.setup({ delay: null });
    userMetadataActions.set(healthyGoogleMetadata);

    server.use(
      rest.get(bookingPageUrl, (_req, res, ctx) =>
        res(ctx.json(unconfiguredPage())),
      ),
    );

    const { wrapper, queryClient } = createStoreWrapper();
    queryClient.setQueryData(calendarQueryKeys.all, [writableCalendar]);
    const view = render(
      <HotkeysProvider>
        <BookingSettingsSection showShortcuts={false} />
      </HotkeysProvider>,
      { wrapper },
    );

    const draftAddress = await screen.findByLabelText("Page address");
    await user.clear(draftAddress);
    await user.type(draftAddress, "new-draft");
    expect(
      screen.queryByText(BOOKING_ADDRESS_CHANGE_WARNING),
    ).not.toBeInTheDocument();

    view.unmount();

    const bookingUrl = "https://compasscalendar.com/meet/hostuser";
    server.use(
      rest.get(bookingPageUrl, (_req, res, ctx) =>
        res(
          ctx.json({
            id: createObjectIdString(),
            slug: "hostuser",
            hostUserId: createObjectIdString(),
            enabled: true,
            durationMinutes: 30,
            destinationCalendarId: writableCalendar.id,
            blockingCalendarIds: [writableCalendar.id],
            timeZone: "America/New_York",
            weeklyAvailability: DEFAULT_WEEKLY_AVAILABILITY,
            minNoticeHours: 4,
            maxHorizonDays: 60,
            bufferMinutes: null,
            maxBookingsPerDay: null,
            guestsCanInviteOthers: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            bookingUrl,
          }),
        ),
      ),
    );

    const live = createStoreWrapper();
    live.queryClient.setQueryData(calendarQueryKeys.all, [writableCalendar]);
    render(
      <HotkeysProvider>
        <BookingSettingsSection showShortcuts={false} />
      </HotkeysProvider>,
      { wrapper: live.wrapper },
    );

    const liveAddress = await screen.findByLabelText("Page address");
    await user.clear(liveAddress);
    await user.type(liveAddress, "new-address");
    const warning = screen.getByText(BOOKING_ADDRESS_CHANGE_WARNING);
    expect(warning).toBeInTheDocument();
    expect(warning).toHaveAttribute("role", "status");
  });

  it("fires booking_settings_opened when the connect prompt mounts", () => {
    setProviderAvailabilityForTests("google", "available", "connect");
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

    expect(mockTrack).toHaveBeenCalledWith("booking_settings_opened", {
      has_connection: false,
      is_live: false,
    });
  });

  it("fires booking_settings_opened for a live connected page", async () => {
    userMetadataActions.set(healthyGoogleMetadata);
    const bookingUrl = "https://compasscalendar.com/meet/hostuser";
    server.use(
      rest.get(bookingPageUrl, (_req, res, ctx) =>
        res(
          ctx.json({
            id: createObjectIdString(),
            slug: "hostuser",
            hostUserId: createObjectIdString(),
            enabled: true,
            durationMinutes: 30,
            destinationCalendarId: writableCalendar.id,
            blockingCalendarIds: [writableCalendar.id],
            timeZone: "America/New_York",
            weeklyAvailability: DEFAULT_WEEKLY_AVAILABILITY,
            minNoticeHours: 4,
            maxHorizonDays: 60,
            bufferMinutes: null,
            maxBookingsPerDay: null,
            guestsCanInviteOthers: true,
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

    await screen.findByLabelText("Page address");
    expect(mockTrack).toHaveBeenCalledWith("booking_settings_opened", {
      has_connection: true,
      is_live: true,
    });
  });

  it("fires booking_page_enabled after Continue, then turn on, with first_time false", async () => {
    const user = userEvent.setup({ delay: null });
    userMetadataActions.set(healthyGoogleMetadata);
    const slug = "hostuser";
    const bookingUrl = `https://compasscalendar.com/meet/${slug}`;
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

    await user.click(await screen.findByRole("button", { name: "Continue" }));
    await user.click(
      await screen.findByRole("switch", { name: "Meeting page" }),
    );

    await waitFor(() => {
      expect(mockTrack).toHaveBeenCalledWith("booking_page_enabled", {
        first_time: false,
      });
    });
    expect(mockTrack).toHaveBeenCalledWith("booking_link_copied", {
      source: "save",
    });
  });

  it("fires booking_page_enabled with first_time false when a saved page turns on", async () => {
    const user = userEvent.setup({ delay: null });
    userMetadataActions.set(healthyGoogleMetadata);
    const bookingUrl = "https://compasscalendar.com/meet/hostuser";
    const writeText = mock(() => Promise.resolve());
    setClipboard({ writeText });

    server.use(
      rest.get(bookingPageUrl, (_req, res, ctx) =>
        res(
          ctx.json({
            id: createObjectIdString(),
            slug: "hostuser",
            hostUserId: createObjectIdString(),
            enabled: false,
            durationMinutes: 30,
            destinationCalendarId: writableCalendar.id,
            blockingCalendarIds: [writableCalendar.id],
            timeZone: "America/New_York",
            weeklyAvailability: DEFAULT_WEEKLY_AVAILABILITY,
            minNoticeHours: 4,
            maxHorizonDays: 60,
            bufferMinutes: null,
            maxBookingsPerDay: null,
            guestsCanInviteOthers: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            bookingUrl,
          }),
        ),
      ),
      rest.put(bookingPageUrl, async (req, res, ctx) =>
        res(
          ctx.json({
            ...((await req.json()) as Record<string, unknown>),
            id: createObjectIdString(),
            slug: "hostuser",
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

    await user.click(
      await screen.findByRole("switch", { name: "Meeting page" }),
    );

    await waitFor(() => {
      expect(mockTrack).toHaveBeenCalledWith("booking_page_enabled", {
        first_time: false,
      });
    });
  });

  it("types a bare e in a weekly-hours field", async () => {
    const user = userEvent.setup({ delay: null });
    userMetadataActions.set(healthyGoogleMetadata);

    server.use(
      rest.get(bookingPageUrl, (_req, res, ctx) =>
        res(ctx.json({ ...savedOffPage(), weeklyAvailability: [] })),
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
    await screen.findByRole("switch", { name: "Meeting page" });

    // "9-5, then 11-2" is not real input, but any typed letter would be: a
    // bare `e` must reach the field, not swallow the next keystroke.
    const hours = screen.getByRole("textbox", { name: /^Hours/ });
    await user.click(hours);
    await user.keyboard("eh");

    expect(hours).toHaveValue("eh");
    expect(document.activeElement).toBe(hours);
  });

  it("blocks the save while a weekly-hours row cannot be read", async () => {
    const user = userEvent.setup({ delay: null });
    userMetadataActions.set(healthyGoogleMetadata);
    let putCount = 0;

    server.use(
      rest.get(bookingPageUrl, (_req, res, ctx) =>
        res(ctx.json(savedOffPage())),
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
    await screen.findByRole("switch", { name: "Meeting page" });

    await user.type(
      screen.getByRole("textbox", { name: /Hours for/ }),
      "whenever",
    );
    await user.tab();
    await user.click(screen.getByRole("switch", { name: "Meeting page" }));

    expect(putCount).toBe(0);
    expect(
      screen.getByText("Fix the weekly hours that could not be read."),
    ).toBeInTheDocument();
  });

  it("saves welcome text", async () => {
    const user = userEvent.setup({ delay: null });
    userMetadataActions.set(healthyGoogleMetadata);
    let savedBody: unknown;

    server.use(
      rest.get(bookingPageUrl, (_req, res, ctx) =>
        res(ctx.json(savedOffPage())),
      ),
      rest.put(bookingPageUrl, async (req, res, ctx) => {
        savedBody = await req.json();
        return res(ctx.json(savedBody as object));
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
    await screen.findByRole("switch", { name: "Meeting page" });

    await user.type(
      screen.getByLabelText("Welcome text"),
      "30 minutes to talk through Compass.",
    );

    await user.click(screen.getByRole("switch", { name: "Meeting page" }));

    await waitFor(() => {
      expect(savedBody).toMatchObject({
        welcomeText: "30 minutes to talk through Compass.",
      });
    });
  });

  it("saves with Mod+Enter while welcome text is focused, and ignores bare s", async () => {
    const user = userEvent.setup({ delay: null });
    userMetadataActions.set(healthyGoogleMetadata);
    let putCount = 0;
    let savedBody: unknown;

    server.use(
      rest.get(bookingPageUrl, (_req, res, ctx) =>
        res(ctx.json(savedOffPage())),
      ),
      rest.put(bookingPageUrl, async (req, res, ctx) => {
        putCount += 1;
        savedBody = await req.json();
        return res(ctx.json(savedBody as object));
      }),
    );

    const { wrapper, queryClient } = createStoreWrapper();
    queryClient.setQueryData(calendarQueryKeys.all, [writableCalendar]);

    render(
      <HotkeysProvider>
        <BookingSettingsWithShortcuts />
      </HotkeysProvider>,
      { wrapper },
    );

    const welcome = await screen.findByLabelText("Welcome text");
    await user.type(welcome, "s");
    expect(putCount).toBe(0);
    expect(welcome).toHaveValue("s");

    dispatchModKey(welcome, "Enter");

    await waitFor(() => {
      expect(savedBody).toMatchObject({ welcomeText: "s" });
    });
    expect(putCount).toBe(1);
  });

  it("always shows Mod+Enter keycaps on Save when hold-Mod hints are off", async () => {
    userMetadataActions.set(healthyGoogleMetadata);

    server.use(
      rest.get(bookingPageUrl, (_req, res, ctx) =>
        res(ctx.json(savedOffPage())),
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

    const save = await screen.findByRole("button", {
      name: BOOKING_SAVE_CHANGES_LABEL,
    });
    expect(save).toHaveAttribute(
      "aria-keyshortcuts",
      "Meta+Enter Control+Enter",
    );
    expect(within(save).getByText("Enter")).toBeInTheDocument();

    const durationLabel = screen.getByText("Duration");
    expect(within(durationLabel).queryByText("5")).not.toBeInTheDocument();
  });

  it("copies the booking link after a save that returns one", async () => {
    const user = userEvent.setup({ delay: null });
    userMetadataActions.set(healthyGoogleMetadata);
    const slug = "hostuser";
    const bookingUrl = `https://compasscalendar.com/meet/${slug}`;
    const writeText = mock(() => Promise.resolve());
    setClipboard({ writeText });

    server.use(
      rest.get(bookingPageUrl, (_req, res, ctx) =>
        res(ctx.json(savedOffPage())),
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
    await screen.findByRole("switch", { name: "Meeting page" });

    await user.click(screen.getByRole("switch", { name: "Meeting page" }));

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
        res(ctx.json(savedOffPage())),
      ),
      // Saving while disabled allocates no slug, so the response carries no
      // bookingUrl and there is nothing to copy.
      rest.put(bookingPageUrl, async (req, res, ctx) => {
        putCount += 1;
        const body = (await req.json()) as Record<string, unknown>;
        return res(
          ctx.json({
            ...body,
            isConfigured: true,
            suggestedSlug: "hostuser",
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
    await screen.findByRole("switch", { name: "Meeting page" });

    await user.selectOptions(screen.getByLabelText("Duration"), "45");
    await user.click(
      screen.getByRole("button", { name: BOOKING_SAVE_CHANGES_LABEL }),
    );

    await waitFor(() => {
      expect(putCount).toBe(1);
    });
    expect(writeText).not.toHaveBeenCalled();
  });

  it("labels a Google primary destination calendar with Google Meet in the chooser", async () => {
    const primary = createMockCalendar({
      name: "host@example.com",
      accountEmail: "host@example.com",
      isPrimary: true,
    });

    userMetadataActions.set(healthyGoogleMetadata);

    server.use(
      rest.get(bookingPageUrl, (_req, res, ctx) =>
        res(
          ctx.json({
            ...savedOffPage(),
            destinationCalendarId: primary.id,
            blockingCalendarIds: [primary.id],
          }),
        ),
      ),
    );

    const { wrapper, queryClient } = createStoreWrapper();
    queryClient.setQueryData(calendarQueryKeys.all, [primary]);

    render(
      <HotkeysProvider>
        <BookingSettingsSection showShortcuts={false} />
      </HotkeysProvider>,
      { wrapper },
    );

    const combobox = await screen.findByRole("combobox", {
      name: "Destination calendar",
    });
    const option = within(combobox).getByRole("option");
    expect(option.textContent).toBe("host@example.com (Google Meet)");
    expect(
      within(combobox).getByRole("group", { name: "host@example.com" }),
    ).toBeInTheDocument();
  });

  it("warns next to Destination calendar when it cannot mint Meet", async () => {
    const noMeet = createMockCalendar({
      name: "Resource room",
      accountEmail: "host@example.com",
      createsGoogleMeet: false,
    });

    userMetadataActions.set(healthyGoogleMetadata);

    server.use(
      rest.get(bookingPageUrl, (_req, res, ctx) =>
        res(
          ctx.json({
            ...savedOffPage(),
            destinationCalendarId: noMeet.id,
            blockingCalendarIds: [noMeet.id],
          }),
        ),
      ),
    );

    const { wrapper, queryClient } = createStoreWrapper();
    queryClient.setQueryData(calendarQueryKeys.all, [noMeet]);

    render(
      <HotkeysProvider>
        <BookingSettingsSection showShortcuts={false} />
      </HotkeysProvider>,
      { wrapper },
    );

    const warning =
      "This calendar cannot create a Google Meet link. Guests will get a calendar invite without a Meet URL.";
    await screen.findByRole("combobox", { name: "Destination calendar" });
    expect(screen.getByText(warning)).toBeInTheDocument();
    expect(
      screen.getByRole("combobox", { name: "Destination calendar" }),
    ).toHaveAccessibleDescription(warning);
  });

  it("labels an Apple destination with No video link and shows the iCloud hint", async () => {
    const appleCalendar = createMockCalendar({
      name: "Personal",
      accountEmail: "host@icloud.com",
      provider: "apple",
      conference: "none",
      createsGoogleMeet: false,
    });

    userMetadataActions.set({
      google: {
        connectionState: "HEALTHY" as const,
        connections: [
          createMockConnection("host@icloud.com", { provider: "apple" }),
        ],
      },
    });

    server.use(
      rest.get(bookingPageUrl, (_req, res, ctx) =>
        res(
          ctx.json({
            ...savedOffPage(),
            destinationCalendarId: appleCalendar.id,
            blockingCalendarIds: [appleCalendar.id],
          }),
        ),
      ),
    );

    const { wrapper, queryClient } = createStoreWrapper();
    queryClient.setQueryData(calendarQueryKeys.all, [appleCalendar]);

    render(
      <HotkeysProvider>
        <BookingSettingsSection showShortcuts={false} />
      </HotkeysProvider>,
      { wrapper },
    );

    const combobox = await screen.findByRole("combobox", {
      name: "Destination calendar",
    });
    expect(within(combobox).getByRole("option").textContent).toBe(
      "Personal (No video link)",
    );
    expect(
      screen.getByText(BOOKING_APPLE_DESTINATION_HINT),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("combobox", { name: "Destination calendar" }),
    ).toHaveAccessibleDescription(BOOKING_APPLE_DESTINATION_HINT);
  });

  it("labels a Microsoft destination with Microsoft Teams in the chooser", async () => {
    const microsoftCalendar = createMockCalendar({
      name: "Work",
      accountEmail: "host@outlook.com",
      provider: "microsoft",
      conference: "teams",
      createsGoogleMeet: false,
    });

    userMetadataActions.set({
      google: {
        connectionState: "NOT_CONNECTED",
        connections: [],
      },
      connections: [
        createMockConnection("host@outlook.com", { provider: "microsoft" }),
      ],
    });

    server.use(
      rest.get(bookingPageUrl, (_req, res, ctx) =>
        res(
          ctx.json({
            ...savedOffPage(),
            destinationCalendarId: microsoftCalendar.id,
            blockingCalendarIds: [microsoftCalendar.id],
          }),
        ),
      ),
    );

    const { wrapper, queryClient } = createStoreWrapper();
    queryClient.setQueryData(calendarQueryKeys.all, [microsoftCalendar]);

    render(
      <HotkeysProvider>
        <BookingSettingsSection showShortcuts={false} />
      </HotkeysProvider>,
      { wrapper },
    );

    const combobox = await screen.findByRole("combobox", {
      name: "Destination calendar",
    });
    expect(within(combobox).getByRole("option").textContent).toBe(
      "Work (Microsoft Teams)",
    );
  });

  it("does not warn when the destination can mint Meet", async () => {
    userMetadataActions.set(healthyGoogleMetadata);

    server.use(
      rest.get(bookingPageUrl, (_req, res, ctx) =>
        res(
          ctx.json({
            ...savedOffPage(),
            destinationCalendarId: writableCalendar.id,
            blockingCalendarIds: [writableCalendar.id],
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

    await screen.findByRole("combobox", { name: "Destination calendar" });
    expect(
      screen.queryByText(/cannot create a Google Meet link/),
    ).not.toBeInTheDocument();
  });

  it("checks the Compass calendar by default on an unconfigured page", async () => {
    const compass = createMockCalendar({
      name: "Compass",
      provider: "local",
    });

    userMetadataActions.set(healthyGoogleMetadata);

    server.use(
      rest.get(bookingPageUrl, (_req, res, ctx) =>
        res(
          ctx.json({
            ...savedOffPage(),
            destinationCalendarId: "000000000000000000000001",
            blockingCalendarIds: ["000000000000000000000001"],
          }),
        ),
      ),
    );

    const { wrapper, queryClient } = createStoreWrapper();
    queryClient.setQueryData(calendarQueryKeys.all, [
      writableCalendar,
      compass,
    ]);

    render(
      <HotkeysProvider>
        <BookingSettingsSection showShortcuts={false} />
      </HotkeysProvider>,
      { wrapper },
    );

    expect(
      await screen.findByRole("checkbox", { name: "Compass" }),
    ).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Work" })).toBeChecked();
  });

  it("blocks enable without a destination calendar", async () => {
    const user = userEvent.setup({ delay: null });

    userMetadataActions.set(healthyGoogleMetadata);

    server.use(
      rest.get(bookingPageUrl, (_req, res, ctx) =>
        res(
          ctx.json({
            ...savedOffPage(),
            destinationCalendarId: "000000000000000000000001",
            blockingCalendarIds: ["000000000000000000000001"],
            weeklyAvailability: [],
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

    await screen.findByRole("switch", { name: "Meeting page" });
    await user.click(screen.getByRole("switch", { name: "Meeting page" }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Choose a destination calendar before enabling your meeting page.",
    );
    expect(
      screen.getByRole("switch", { name: "Meeting page" }),
    ).toHaveAttribute("aria-checked", "false");
  });

  it("blocks enabling a page with no weekly hours and does not PUT", async () => {
    const user = userEvent.setup({ delay: null });
    let putCount = 0;

    userMetadataActions.set(healthyGoogleMetadata);

    server.use(
      rest.get(bookingPageUrl, (_req, res, ctx) =>
        res(ctx.json(savedOffPage())),
      ),
      rest.put(bookingPageUrl, (_req, res, ctx) => {
        putCount += 1;
        return res(ctx.status(500));
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

    await screen.findByRole("switch", { name: "Meeting page" });
    const hours = screen.getByRole("textbox", { name: /Hours for/ });
    await user.clear(hours);
    await user.tab();
    await user.click(screen.getByRole("switch", { name: "Meeting page" }));

    const hoursAlert = screen.getByRole("alert");
    expect(hoursAlert).toHaveTextContent(
      "Add weekly hours before turning on your meeting page.",
    );
    expect(findStickyAncestor(hoursAlert)).not.toBeNull();
    expect(putCount).toBe(0);
    expect(document.activeElement).toBe(screen.getByLabelText("Monday"));
    expect(
      screen.getByRole("switch", { name: "Meeting page" }),
    ).toHaveAttribute("aria-checked", "false");
  });

  it("renders Monday through Friday as 9-5 on a fresh unconfigured page", async () => {
    userMetadataActions.set(healthyGoogleMetadata);

    server.use(
      rest.get(bookingPageUrl, (_req, res, ctx) =>
        res(ctx.json(savedOffPage())),
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

    expect(
      await screen.findByRole("button", { name: "Monday" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Tuesday" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "Wednesday" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "Thursday" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "Friday" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "Saturday" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(screen.getByRole("button", { name: "Sunday" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(screen.getByRole("textbox", { name: /Hours for/ })).toHaveValue(
      "9am-5pm",
    );
  });

  it("shows an error on PUT 403 without crashing Settings", async () => {
    const user = userEvent.setup({ delay: null });
    const { port, mocks } = createTestToastPort();
    registerToastPort(port);

    userMetadataActions.set(healthyGoogleMetadata);

    server.use(
      rest.get(bookingPageUrl, (_req, res, ctx) =>
        res(
          ctx.json({
            ...savedOffPage(),
          }),
        ),
      ),
      rest.put(bookingPageUrl, (_req, res, ctx) =>
        res(
          ctx.status(403),
          ctx.json({
            code: "CALENDAR_NOT_CONNECTED",
            message:
              "Connect a healthy calendar account before enabling your meeting page",
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

    await screen.findByRole("switch", { name: "Meeting page" });
    await user.click(screen.getByRole("switch", { name: "Meeting page" }));

    expect(
      screen.getByRole("switch", { name: "Meeting page" }),
    ).toHaveAttribute("aria-checked", "false");
    await waitFor(() => {
      expect(mocks.error).toHaveBeenCalledWith(
        "Could not save meeting settings. Please try again.",
        expect.any(Object),
      );
    });
    expect(String(mocks.error.mock.calls[0]?.[0])).not.toMatch(
      /Request failed for/,
    );
  });

  it("explains a blocking-calendar save failure without transport text", async () => {
    const user = userEvent.setup({ delay: null });
    const { port, mocks } = createTestToastPort();
    registerToastPort(port);

    userMetadataActions.set(healthyGoogleMetadata);

    server.use(
      rest.get(bookingPageUrl, (_req, res, ctx) =>
        res(
          ctx.json({
            ...savedOffPage(),
          }),
        ),
      ),
      rest.put(bookingPageUrl, (_req, res, ctx) =>
        res(
          ctx.status(400),
          ctx.json({
            code: "BLOCKING_CALENDAR_INVALID",
            message: "Calendar is not readable",
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

    await screen.findByRole("switch", { name: "Meeting page" });
    await user.click(screen.getByRole("switch", { name: "Meeting page" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        "One of your blocking calendars can't be checked for busy times. Uncheck it and save again.",
      );
    });
    expect(mocks.error).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(
      screen.getByRole("checkbox", { name: "Work" }),
    );
  });

  it("shows an inline error for a cleared horizon field and blocks save", async () => {
    const user = userEvent.setup({ delay: null });
    let savedBody: unknown;

    userMetadataActions.set(healthyGoogleMetadata);
    server.use(
      rest.get(bookingPageUrl, (_req, res, ctx) =>
        res(ctx.json(savedOffPage())),
      ),
      rest.put(bookingPageUrl, async (req, res, ctx) => {
        savedBody = await req.json();
        return res(
          ctx.json({
            ...(savedBody as object),
            isConfigured: true,
            suggestedSlug: "hostuser",
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

    const horizon = await screen.findByLabelText("Maximum horizon (days)");
    await user.clear(horizon);

    expect(screen.getByText("Enter 1 to 60 days.")).toBeInTheDocument();
    expect(horizon).toHaveAttribute("aria-invalid", "true");

    await user.click(screen.getByRole("switch", { name: "Meeting page" }));
    expect(
      screen.getByText("Fix the highlighted number fields before saving."),
    ).toBeInTheDocument();
    expect(savedBody).toBeUndefined();

    await user.type(horizon, "30");
    expect(screen.queryByText("Enter 1 to 60 days.")).not.toBeInTheDocument();

    await user.click(screen.getByRole("switch", { name: "Meeting page" }));
    await waitFor(() => {
      expect(savedBody).toMatchObject({ maxHorizonDays: 30 });
    });
  });

  it("shows an inline error for out-of-range notice and blocks save", async () => {
    const user = userEvent.setup({ delay: null });
    let savedBody: unknown;

    userMetadataActions.set(healthyGoogleMetadata);
    server.use(
      rest.get(bookingPageUrl, (_req, res, ctx) =>
        res(ctx.json(savedOffPage())),
      ),
      rest.put(bookingPageUrl, async (req, res, ctx) => {
        savedBody = await req.json();
        return res(
          ctx.json({
            ...(savedBody as object),
            isConfigured: true,
            suggestedSlug: "hostuser",
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

    const notice = await screen.findByLabelText("Minimum notice (hours)");
    await user.clear(notice);
    await user.type(notice, "1441");

    expect(screen.getByText("Enter 0 to 1440 hours.")).toBeInTheDocument();
    expect(notice).toHaveAttribute("aria-invalid", "true");

    await user.click(screen.getByRole("switch", { name: "Meeting page" }));
    expect(
      screen.getByText("Fix the highlighted number fields before saving."),
    ).toBeInTheDocument();
    expect(savedBody).toBeUndefined();

    await user.clear(notice);
    await user.type(notice, "4");
    expect(
      screen.queryByText("Enter 0 to 1440 hours."),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("switch", { name: "Meeting page" }));
    await waitFor(() => {
      expect(savedBody).toMatchObject({ minNoticeHours: 4 });
    });
  });

  it("turns on a not-live page and toasts the live copy", async () => {
    const user = userEvent.setup({ delay: null });
    const { port, mocks } = createTestToastPort();
    registerToastPort(port);
    const writeText = mock(() => Promise.resolve());
    setClipboard({ writeText });
    let savedBody: unknown;
    const bookingUrl = "https://compasscalendar.com/meet/hostuser";

    userMetadataActions.set(healthyGoogleMetadata);
    server.use(
      rest.get(bookingPageUrl, (_req, res, ctx) =>
        res(ctx.json(savedOffPage())),
      ),
      rest.put(bookingPageUrl, async (req, res, ctx) => {
        savedBody = await req.json();
        return res(
          ctx.json({
            ...(savedBody as object),
            id: createObjectIdString(),
            slug: "hostuser",
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

    await user.click(
      await screen.findByRole("switch", { name: "Meeting page" }),
    );

    await waitFor(() => {
      expect(savedBody).toMatchObject({ enabled: true });
    });
    expect(writeText).toHaveBeenCalledWith(bookingUrl);
    expect(mocks.toast).toHaveBeenCalledWith(
      "Your meeting page is live. Link copied.",
      expect.any(Object),
    );
  });

  it("turns off a live page", async () => {
    const user = userEvent.setup({ delay: null });
    const { port, mocks } = createTestToastPort();
    registerToastPort(port);
    let savedBody: unknown;
    const bookingUrl = "https://compasscalendar.com/meet/hostuser";

    userMetadataActions.set(healthyGoogleMetadata);
    server.use(
      rest.get(bookingPageUrl, (_req, res, ctx) =>
        res(
          ctx.json({
            id: createObjectIdString(),
            slug: "hostuser",
            hostUserId: createObjectIdString(),
            enabled: true,
            durationMinutes: 30,
            destinationCalendarId: writableCalendar.id,
            blockingCalendarIds: [writableCalendar.id],
            timeZone: "UTC",
            weeklyAvailability: DEFAULT_WEEKLY_AVAILABILITY,
            minNoticeHours: 4,
            maxHorizonDays: 60,
            bufferMinutes: null,
            maxBookingsPerDay: null,
            guestsCanInviteOthers: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            bookingUrl,
          }),
        ),
      ),
      rest.put(bookingPageUrl, async (req, res, ctx) => {
        savedBody = await req.json();
        return res(
          ctx.json({
            id: createObjectIdString(),
            slug: "hostuser",
            hostUserId: createObjectIdString(),
            ...(savedBody as object),
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

    await user.click(
      await screen.findByRole("switch", { name: "Meeting page" }),
    );

    await waitFor(() => {
      expect(savedBody).toMatchObject({ enabled: false });
    });
    await waitFor(() => {
      expect(mocks.toast).toHaveBeenCalledWith(
        "Meeting page turned off.",
        expect.any(Object),
      );
    });
  });

  it("saves changes while off without turning the page on", async () => {
    const user = userEvent.setup({ delay: null });
    let savedBody: unknown;
    userMetadataActions.set(healthyGoogleMetadata);
    server.use(
      rest.get(bookingPageUrl, (_req, res, ctx) =>
        res(ctx.json(savedOffPage())),
      ),
      rest.put(bookingPageUrl, async (req, res, ctx) => {
        savedBody = await req.json();
        return res(
          ctx.json({
            ...(savedBody as object),
            isConfigured: true,
            suggestedSlug: "hostuser",
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

    await screen.findByRole("switch", { name: "Meeting page" });
    expect(
      screen.queryByRole("button", { name: "Turn on meeting page" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Save draft" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Turn off meeting page" }),
    ).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText("Duration"), "45");
    await user.click(
      screen.getByRole("button", { name: BOOKING_SAVE_CHANGES_LABEL }),
    );

    await waitFor(() => {
      expect(savedBody).toMatchObject({
        durationMinutes: 45,
        enabled: false,
      });
    });
    expect(
      screen.getByRole("switch", { name: "Meeting page" }),
    ).toHaveAttribute("aria-checked", "false");
  });

  it("leaves the switch off when the server rejects enable", async () => {
    const user = userEvent.setup({ delay: null });
    userMetadataActions.set(healthyGoogleMetadata);

    server.use(
      rest.get(bookingPageUrl, (_req, res, ctx) =>
        res(ctx.json(savedOffPage())),
      ),
      rest.put(bookingPageUrl, (_req, res, ctx) =>
        res(
          ctx.status(400),
          ctx.json({
            code: "AVAILABILITY_REQUIRED",
            message: "Weekly availability is required",
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

    await user.click(
      await screen.findByRole("switch", { name: "Meeting page" }),
    );

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        BOOKING_SAVE_ERROR_COPY.AVAILABILITY_REQUIRED,
      );
    });
    expect(
      screen.getByRole("switch", { name: "Meeting page" }),
    ).toHaveAttribute("aria-checked", "false");
  });

  it("Mod+4 focuses the switch without toggling it", async () => {
    const user = userEvent.setup({ delay: null });
    userMetadataActions.set(healthyGoogleMetadata);
    server.use(
      rest.get(bookingPageUrl, (_req, res, ctx) =>
        res(ctx.json(savedOffPage())),
      ),
    );

    const { wrapper, queryClient } = createStoreWrapper();
    queryClient.setQueryData(calendarQueryKeys.all, [writableCalendar]);
    render(
      <HotkeysProvider>
        <BookingSettingsWithShortcuts />
      </HotkeysProvider>,
      { wrapper },
    );

    const control = await screen.findByRole("switch", {
      name: "Meeting page",
    });
    expect(control).toHaveAttribute("aria-checked", "false");

    const modKey = resolveModifier("Mod") === "Meta" ? "Meta" : "Control";
    await user.keyboard(`{${modKey}>}4{/${modKey}}`);

    expect(control).toHaveFocus();
    expect(control).toHaveAttribute("aria-checked", "false");
  });

  it("keeps More options closed by default", async () => {
    userMetadataActions.set(healthyGoogleMetadata);
    server.use(
      rest.get(bookingPageUrl, (_req, res, ctx) =>
        res(ctx.json(savedOffPage())),
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

    const summary = await screen.findByText(BOOKING_MORE_OPTIONS_LABEL);
    const details = summary.closest("details");
    expect(details).not.toBeNull();
    expect(details).not.toHaveAttribute("open");
  });

  it("opens More options when a field inside the collapsed group becomes invalid", async () => {
    const user = userEvent.setup({ delay: null });
    userMetadataActions.set(healthyGoogleMetadata);
    server.use(
      rest.get(bookingPageUrl, (_req, res, ctx) =>
        res(ctx.json(savedOffPage())),
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

    const summary = await screen.findByText(BOOKING_MORE_OPTIONS_LABEL);
    const details = summary.closest("details");
    expect(details).not.toHaveAttribute("open");

    await user.clear(screen.getByLabelText("Maximum horizon (days)"));
    expect(details).toHaveAttribute("open");
  });

  it("renders DESTINATION_NOT_WRITABLE inline, focuses destination, and does not toast", async () => {
    const user = userEvent.setup({ delay: null });
    const { port, mocks } = createTestToastPort();
    registerToastPort(port);

    userMetadataActions.set(healthyGoogleMetadata);
    server.use(
      rest.get(bookingPageUrl, (_req, res, ctx) =>
        res(ctx.json(savedOffPage())),
      ),
      rest.put(bookingPageUrl, (_req, res, ctx) =>
        res(
          ctx.status(400),
          ctx.json({
            code: "DESTINATION_NOT_WRITABLE",
            message: "Calendar is not writable",
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

    await user.click(
      await screen.findByRole("switch", { name: "Meeting page" }),
    );

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        BOOKING_SAVE_ERROR_COPY.DESTINATION_NOT_WRITABLE,
      );
    });
    expect(mocks.error).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(document.activeElement).toBe(
        screen.getByRole("combobox", { name: "Destination calendar" }),
      );
    });
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

  it("opens an ancestor details element before focusing", () => {
    const details = document.createElement("details");
    const summary = document.createElement("summary");
    summary.textContent = "More options";
    const wrapper = document.createElement("div");
    wrapper.setAttribute("data-booking-field", "welcome");
    const textarea = document.createElement("textarea");
    wrapper.append(textarea);
    details.append(summary, wrapper);
    document.body.append(details);

    expect(details.open).toBe(false);
    expect(focusBookingField("welcome")).toBe(true);
    expect(details.open).toBe(true);
    expect(document.activeElement).toBe(textarea);
  });
});
