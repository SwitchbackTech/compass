import { expect, type Page } from "@playwright/test";

/** ObjectId-shaped id for stubbed Google calendar in host settings e2e. */
export const BOOKING_CALENDAR_ID = "64b7f0a1c2d3e4f5a6b7c8d9";

export const HOST_ACCOUNT_EMAIL = "host@example.com";

const googleCalendar = {
  id: BOOKING_CALENDAR_ID,
  name: "Work",
  description: "",
  timeZone: "America/Chicago",
  foregroundColor: "#ffffff",
  backgroundColor: "#4285f4",
  provider: "google",
  access: "owner",
  capabilities: {
    canReadAvailability: true,
    canReadDetails: true,
    canWrite: true,
    canManage: true,
    canWatchEvents: true,
  },
  isPrimary: true,
  isVisible: true,
  isActive: true,
  accountEmail: HOST_ACCOUNT_EMAIL,
};

/** A slot later in the current UTC month, inside today's remaining hours when the month is ending. */
export function buildBookableSlot(durationMinutes = 30): {
  slotStart: string;
  slotEnd: string;
} {
  const now = new Date();
  const start = new Date(now);
  start.setUTCDate(now.getUTCDate() + 2);
  start.setUTCHours(15, 0, 0, 0);
  const sameMonth =
    start.getUTCMonth() === now.getUTCMonth() &&
    start.getUTCFullYear() === now.getUTCFullYear();
  if (!sameMonth || start.getTime() <= now.getTime()) {
    start.setTime(now.getTime());
    start.setUTCHours(15, 0, 0, 0);
    if (
      start.getTime() <= now.getTime() ||
      start.getUTCMonth() !== now.getUTCMonth()
    ) {
      start.setTime(now.getTime() + 2 * 60 * 60 * 1000);
      start.setUTCMinutes(0, 0, 0);
    }
  }
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
  return { slotStart: start.toISOString(), slotEnd: end.toISOString() };
}

export interface PublicBookingStubOptions {
  slug?: string;
  hostDisplayName?: string;
  durationMinutes?: number;
  slots?: Array<{ slotStart: string; slotEnd: string }>;
  bookable?: boolean;
  /** When set, POST /reservations returns this status instead of 200. */
  confirmStatus?: number;
  /** When set, the reservation POST waits until this resolves (for in-flight UI). */
  holdConfirm?: Promise<void>;
  /** When true, slot GETs return 500 until `slotFailGate.fail` is set false. */
  slotFailGate?: { fail: boolean };
  /** When set, the first slot GET waits until this resolves. */
  holdFirstSlots?: Promise<void>;
}

export interface CapturedBookingRequests {
  reservationPosts: Array<Record<string, unknown>>;
  slotGets: number;
  slotQueries: Array<{ start: string | null; end: string | null }>;
}

export async function preparePublicBookingPage(
  page: Page,
  options: PublicBookingStubOptions = {},
): Promise<CapturedBookingRequests> {
  const slug = options.slug ?? "tylerdane";
  const captured: CapturedBookingRequests = {
    reservationPosts: [],
    slotGets: 0,
    slotQueries: [],
  };
  const slot =
    options.slots?.[0] ?? buildBookableSlot(options.durationMinutes ?? 30);
  const slots = options.slots ?? [slot];

  const json = (body: unknown, status = 200) => ({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });

  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;

    if (path === `/api/booking/pages/${slug}` && request.method() === "GET") {
      return route.fulfill(
        json({
          hostDisplayName: options.hostDisplayName ?? "Tyler Dane",
          durationMinutes: options.durationMinutes ?? 30,
          timeZone: "America/Chicago",
          enabled: true,
          maxHorizonDays: 60,
        }),
      );
    }

    if (
      path === `/api/booking/pages/${slug}/slots` &&
      request.method() === "GET"
    ) {
      captured.slotGets += 1;
      const windowStart = url.searchParams.get("start");
      const windowEnd = url.searchParams.get("end");
      captured.slotQueries.push({
        start: windowStart,
        end: windowEnd,
      });
      if (options.holdFirstSlots && captured.slotGets === 1) {
        await options.holdFirstSlots;
      }
      if (options.slotFailGate?.fail) {
        return route.fulfill(json({}, 500));
      }
      const startMs = windowStart ? Date.parse(windowStart) : Number.NaN;
      const endMs = windowEnd ? Date.parse(windowEnd) : Number.NaN;
      const slotsInWindow = slots.filter((entry) => {
        const slotMs = Date.parse(entry.slotStart);
        return slotMs >= startMs && slotMs < endMs;
      });
      return route.fulfill(
        json({
          bookable: options.bookable ?? true,
          slots: slotsInWindow,
        }),
      );
    }

    if (
      path === `/api/booking/pages/${slug}/reservations` &&
      request.method() === "POST"
    ) {
      const body = request.postDataJSON() as Record<string, unknown>;
      captured.reservationPosts.push(body);
      if (options.holdConfirm) {
        await options.holdConfirm;
      }
      if (options.confirmStatus === 409) {
        return route.fulfill(json({}, 409));
      }
      return route.fulfill(
        json({
          reservationId: "000000000000000000000099",
          slotStart: body.slotStart,
          slotEnd: slot.slotEnd,
          guestTimeZone: body.guestTimeZone,
          cancelUrl:
            "https://compasscalendar.com/book/cancel/000000000000000000000099?token=abc",
        }),
      );
    }

    return route.fulfill(json({}));
  });

  await page.goto(`/book/${slug}`, { waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("heading", { name: "Book with Tyler Dane" }),
  ).toBeVisible({ timeout: 15000 });

  return captured;
}

export interface PublicBookingCancelStubOptions {
  reservationId?: string;
  token?: string;
  /** HTTP status for POST /reservations/:id/cancel. Default 200. */
  cancelStatus?: number;
  /** When set, the cancel POST waits until this resolves (for in-flight UI). */
  holdCancel?: Promise<void>;
}

export interface CapturedCancelRequests {
  cancelPosts: Array<Record<string, unknown>>;
}

export async function preparePublicBookingCancelPage(
  page: Page,
  options: PublicBookingCancelStubOptions = {},
): Promise<CapturedCancelRequests> {
  const reservationId = options.reservationId ?? "000000000000000000000099";
  const token = options.token ?? "abc";
  const captured: CapturedCancelRequests = { cancelPosts: [] };

  const json = (body: unknown, status = 200) => ({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });

  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;

    if (
      path === `/api/booking/reservations/${reservationId}/cancel` &&
      request.method() === "POST"
    ) {
      const body = (request.postDataJSON() ?? {}) as Record<string, unknown>;
      captured.cancelPosts.push(body);
      if (options.holdCancel) {
        await options.holdCancel;
      }
      const status = options.cancelStatus ?? 200;
      return route.fulfill(json(status === 200 ? { ok: true } : {}, status));
    }

    return route.fulfill(json({}));
  });

  const search = token ? `?token=${encodeURIComponent(token)}` : "";
  await page.goto(`/book/cancel/${reservationId}${search}`, {
    waitUntil: "domcontentloaded",
  });

  return captured;
}

export interface HostBookingSettingsStubOptions {
  slug?: string;
  bookingUrl?: string;
}

export interface CapturedHostBookingRequests {
  putBodies: Array<Record<string, unknown>>;
}

export async function prepareSignedInBookingSettingsPage(
  page: Page,
  options: HostBookingSettingsStubOptions = {},
): Promise<CapturedHostBookingRequests> {
  const slug = options.slug ?? "hostuser";
  const bookingUrl =
    options.bookingUrl ?? `https://compasscalendar.com/book/${slug}`;
  const captured: CapturedHostBookingRequests = { putBodies: [] };

  await page.addInitScript((accountEmail) => {
    (
      window as Window & { __COMPASS_E2E_TEST__?: boolean }
    ).__COMPASS_E2E_TEST__ = true;
    localStorage.setItem(
      "compass.auth",
      JSON.stringify({ hasAuthenticated: true, lastKnownEmail: accountEmail }),
    );
  }, HOST_ACCOUNT_EMAIL);

  const json = (body: unknown, status = 200) => ({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });

  const bookingPagePayload = {
    enabled: false,
    durationMinutes: 45,
    destinationCalendarId: BOOKING_CALENDAR_ID,
    blockingCalendarIds: [BOOKING_CALENDAR_ID],
    timeZone: "America/New_York",
    weeklyAvailability: [],
    minNoticeHours: 4,
    maxHorizonDays: 60,
    bufferMinutes: null,
    maxBookingsPerDay: null,
    guestsCanInviteOthers: true,
  };

  const savedPageFields = {
    id: "000000000000000000000001",
    slug,
    hostUserId: "000000000000000000000002",
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
    bookingUrl,
  };

  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;

    if (path.endsWith("/api/calendars")) {
      return route.fulfill(json({ calendars: [googleCalendar] }));
    }

    if (path.endsWith("/api/event") && request.method() === "GET") {
      return route.fulfill(json({ events: [] }));
    }

    if (path.endsWith("/api/booking/page") && request.method() === "GET") {
      // The saved-page shape, which is what the real GET returns once a slug
      // exists. Returning the bare input shape here hid a bug where the
      // response-only keys rode into the strict PUT schema and killed every
      // save after the first.
      return route.fulfill(json({ ...bookingPagePayload, ...savedPageFields }));
    }

    if (path.endsWith("/api/booking/page") && request.method() === "PUT") {
      const body = request.postDataJSON() as Record<string, unknown>;
      captured.putBodies.push(body);
      return route.fulfill(
        json({
          ...bookingPagePayload,
          ...savedPageFields,
          ...body,
        }),
      );
    }

    if (path.endsWith("/api/user/metadata")) {
      return route.fulfill(
        json({
          google: {
            connectionState: "HEALTHY",
            connections: [
              {
                id: "e2e-connection-1",
                state: "healthy",
                stateReason: null,
                lastSyncedAt: null,
                lastHealthyAt: null,
                accountEmail: HOST_ACCOUNT_EMAIL,
                connectionState: "HEALTHY",
                canSuggestContacts: false,
              },
            ],
          },
        }),
      );
    }

    if (path.endsWith("/api/config")) {
      return route.fulfill(json({ google: { isConfigured: true } }));
    }

    return route.fulfill(json({}));
  });

  await page.goto("/week", { waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("heading", { level: 1 }).getByRole("button"),
  ).toBeVisible({ timeout: 15000 });

  await page.waitForFunction(
    () =>
      (
        window as Window & {
          __COMPASS_E2E_HOOKS__?: { setAuthenticated: (v: boolean) => void };
        }
      ).__COMPASS_E2E_HOOKS__ !== undefined,
  );
  await page.evaluate(() => {
    (
      window as Window & {
        __COMPASS_E2E_HOOKS__?: { setAuthenticated: (v: boolean) => void };
      }
    ).__COMPASS_E2E_HOOKS__?.setAuthenticated(true);
  });

  await page.waitForFunction(() => {
    const bridge = (
      window as Window & {
        __COMPASS_E2E_STORE__?: { userMetadata?: unknown };
      }
    ).__COMPASS_E2E_STORE__;
    return Boolean(bridge?.userMetadata);
  });
  await page.evaluate(
    (metadata) => {
      const bridge = (
        window as Window & {
          __COMPASS_E2E_STORE__?: {
            userMetadata?: { set: (metadata: unknown) => void };
          };
        }
      ).__COMPASS_E2E_STORE__;
      bridge?.userMetadata?.set(metadata);
    },
    {
      google: {
        connectionState: "HEALTHY",
        connections: [
          {
            id: "e2e-connection-1",
            state: "healthy",
            stateReason: null,
            lastSyncedAt: null,
            lastHealthyAt: null,
            accountEmail: HOST_ACCOUNT_EMAIL,
            connectionState: "HEALTHY",
            canSuggestContacts: false,
          },
        ],
      },
    },
  );

  await page.keyboard.press("Escape");
  await page.keyboard.press("Control+Comma");

  const settingsDialog = page.getByRole("dialog", { name: "Settings" });
  await expect(settingsDialog).toBeVisible({ timeout: 10000 });
  await page.evaluate(() => {
    document
      .querySelector<HTMLElement>('[data-settings-shortcut="nav-booking"]')
      ?.click();
  });
  await expect(
    settingsDialog.getByRole("button", { name: "Save booking settings" }),
  ).toBeVisible({ timeout: 15000 });

  return captured;
}

/** Dispatches a DOM click for OverlayPanel buttons that re-render during Playwright clicks. */
export const dispatchClick = async (
  locator: import("@playwright/test").Locator,
) => {
  await locator.waitFor({ state: "attached", timeout: 10000 });
  await locator.evaluate((el) => {
    (el as HTMLElement).click();
  });
};

export function formatSlotButtonLabel(
  slotStart: string,
  timeZone = "UTC",
): RegExp {
  const time = new Intl.DateTimeFormat(undefined, {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(slotStart));
  const escaped = time.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(escaped, "i");
}
