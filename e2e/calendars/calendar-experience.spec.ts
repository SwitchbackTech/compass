import { expect, type Page, test } from "@playwright/test";
import {
  ensureSidebarOpen,
  openTimedEventFormWithMouse,
} from "../utils/event-test-utils";

test.skip(
  ({ isMobile }) => isMobile,
  "Mouse/keyboard flows are desktop-only in week view.",
);

// Fixtures. CalendarSchema/EventSchema (packages/core/src/types) are zod
// strictObjects - an extra or missing field fails parsing client-side and
// the app renders nothing, so every fixture below is a full, honest member
// of those shapes. IDs are 24-char hex (ObjectId format). Event times anchor
// on "today" so the default week view (dayjs().startOf("week"), always
// including today) renders them without knowing the week-start convention.

const objectId = (seed: string) => seed.repeat(24);

const CALENDAR_A_ID = objectId("a");
const CALENDAR_B_ID = objectId("b");
const CALENDAR_LOCAL_ID = objectId("c");
const EVENT_A_ID = objectId("1");
const EVENT_B_ID = objectId("2");

const CALENDAR_A_NAME = "Acme Work";
const CALENDAR_B_NAME = "Design Team";
const LOCAL_CALENDAR_NAME = "Local";

const EVENT_A_TITLE = "Team sync";
const EVENT_B_TITLE = "Reader event";

const TIME_ZONE = "America/Denver";

const CAPABILITIES = {
  owner: {
    canReadAvailability: true,
    canReadDetails: true,
    canWrite: true,
    canManage: true,
    canWatchEvents: true,
  },
  reader: {
    canReadAvailability: true,
    canReadDetails: true,
    canWrite: false,
    canManage: false,
    canWatchEvents: true,
  },
};

function calendar(overrides: {
  id: string;
  name: string;
  timeZone: string | null;
  backgroundColor: string;
  provider: "local" | "google";
  access: "owner" | "reader";
  isPrimary: boolean;
  isVisible: boolean;
}) {
  return {
    ...overrides,
    description: "",
    foregroundColor: "#ffffff",
    capabilities: CAPABILITIES[overrides.access],
    isActive: true,
  };
}

const pad = (value: number) => String(value).padStart(2, "0");

// Formats a local Date as RFC3339 with an explicit numeric offset (never
// "Z"), matching the DateTimeSchema contract and staying correct regardless
// of which timezone the test happens to run in.
function toOffsetDateTime(date: Date): string {
  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const hours = pad(Math.floor(Math.abs(offsetMinutes) / 60));
  const minutes = pad(Math.abs(offsetMinutes) % 60);
  const datePart = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const timePart = `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;

  return `${datePart}T${timePart}${sign}${hours}:${minutes}`;
}

// A Date at today + the given minute offset from midnight local time -
// always inside the currently-viewed week, regardless of the app's
// week-start convention.
function todayAtMinutes(minutesFromMidnight: number): Date {
  const now = new Date();
  return new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    0,
    minutesFromMidnight,
  );
}

function buildEvent(
  id: string,
  calendarId: string,
  title: string,
  startHour: number,
  // A tall-enough card keeps click/drag targets clear of the (invisible,
  // still hit-testable) resize handles pinned to its top/bottom edges.
  durationMinutes = 90,
) {
  const startMinutes = startHour * 60;
  return {
    id,
    calendarId,
    content: { kind: "details", title, description: "" },
    schedule: {
      kind: "timed",
      start: toOffsetDateTime(todayAtMinutes(startMinutes)),
      end: toOffsetDateTime(todayAtMinutes(startMinutes + durationMinutes)),
      timeZone: TIME_ZONE,
    },
    recurrence: { kind: "single" },
    priority: "unassigned",
    createdAt: toOffsetDateTime(new Date()),
    updatedAt: null,
  };
}

type FixtureEvent = ReturnType<typeof buildEvent>;

const DEFAULT_EVENTS: FixtureEvent[] = [
  buildEvent(EVENT_A_ID, CALENDAR_A_ID, EVENT_A_TITLE, 9),
  buildEvent(EVENT_B_ID, CALENDAR_B_ID, EVENT_B_TITLE, 13),
];

function buildCalendars(visibility: Record<string, boolean>) {
  return [
    calendar({
      id: CALENDAR_A_ID,
      name: CALENDAR_A_NAME,
      timeZone: TIME_ZONE,
      backgroundColor: "#4285f4",
      provider: "google",
      access: "owner",
      isPrimary: true,
      isVisible: visibility[CALENDAR_A_ID],
    }),
    calendar({
      id: CALENDAR_B_ID,
      name: CALENDAR_B_NAME,
      timeZone: TIME_ZONE,
      backgroundColor: "#34a853",
      provider: "google",
      access: "reader",
      isPrimary: false,
      isVisible: visibility[CALENDAR_B_ID],
    }),
    calendar({
      id: CALENDAR_LOCAL_ID,
      name: LOCAL_CALENDAR_NAME,
      timeZone: null,
      backgroundColor: "#9aa0a6",
      provider: "local",
      access: "owner",
      isPrimary: false,
      isVisible: visibility[CALENDAR_LOCAL_ID],
    }),
  ];
}

interface VisibilityUpdate {
  calendarId: string;
  isVisible: boolean;
}

interface CalendarExperienceHarness {
  putCalls: VisibilityUpdate[][];
  mutationRequests: { method: string; pathname: string }[];
}

type CompassE2EWindow = Window & {
  __COMPASS_E2E_TEST__?: boolean;
  __COMPASS_E2E_HOOKS__?: { setAuthenticated: (value: boolean) => void };
};

/**
 * Sets up the packet-08 authenticated experience over route-stubbed APIs: an
 * e2e-mode window flag (skips the real SuperTokens check), a pre-seeded
 * "has authenticated before" flag (so the event repository targets the
 * remote API instead of IndexedDB - see event.repository.factory.ts), and
 * handlers for every endpoint the calendar sidebar/CalendarSelect/read-only
 * form/availability query touch. The calendars and event-list handlers
 * share `visibility` state so a `/calendars/select` PUT is reflected by
 * both on the next refetch, emulating server-side visibility filtering
 * (packet 08 step 4). The event-list handler only answers "range" queries -
 * a "someday" query correctly gets nothing back since every fixture event
 * here is timed.
 */
async function setupCalendarExperiencePage(
  page: Page,
  events: FixtureEvent[] = DEFAULT_EVENTS,
): Promise<CalendarExperienceHarness> {
  const visibility: Record<string, boolean> = {
    [CALENDAR_A_ID]: true,
    [CALENDAR_B_ID]: true,
    [CALENDAR_LOCAL_ID]: true,
  };
  const harness: CalendarExperienceHarness = {
    putCalls: [],
    mutationRequests: [],
  };

  await page.addInitScript(() => {
    (window as CompassE2EWindow).__COMPASS_E2E_TEST__ = true;
    window.alert = () => undefined;
    window.confirm = () => true;
    window.prompt = () => null;
    localStorage.setItem(
      "compass.auth",
      JSON.stringify({
        hasAuthenticated: true,
        lastKnownEmail: "e2e@example.com",
        shouldPromptSignUpAfterAnonymousCalendarChange: false,
      }),
    );
  });

  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const { pathname } = url;
    const method = request.method();
    const json = (body: unknown, status = 200) =>
      route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify(body),
      });

    if (pathname.endsWith("/api/user/metadata")) {
      return json({ google: { connectionState: "HEALTHY" } });
    }
    if (pathname.endsWith("/api/config")) {
      return json({ google: { isConfigured: true } });
    }
    if (pathname.endsWith("/api/calendars/select") && method === "PUT") {
      const body = request.postDataJSON() as VisibilityUpdate[];
      harness.putCalls.push(body);
      for (const entry of body) {
        visibility[entry.calendarId] = entry.isVisible;
      }
      return route.fulfill({ status: 204 });
    }
    if (pathname.endsWith("/api/calendars/availability")) {
      return json({ busyPeriods: [] });
    }
    if (pathname.endsWith("/api/calendars") && method === "GET") {
      return json({ calendars: buildCalendars(visibility) });
    }
    if (pathname.endsWith("/api/event") && method === "GET") {
      const isSomedayQuery = url.searchParams.get("kind") === "someday";
      const matching = isSomedayQuery
        ? []
        : events.filter((event) => visibility[event.calendarId] !== false);
      return json({ events: matching });
    }
    if (pathname.startsWith("/api/event") && method !== "GET") {
      harness.mutationRequests.push({ method, pathname });
      return json({});
    }

    return json({});
  });

  await page.goto("/week", { waitUntil: "domcontentloaded" });
  await page
    .getByRole("button", { name: /select view, currently/i })
    .first()
    .waitFor({ state: "visible", timeout: 15000 });

  await page.waitForFunction(
    () => (window as CompassE2EWindow).__COMPASS_E2E_HOOKS__ !== undefined,
  );
  await page.evaluate(() => {
    (window as CompassE2EWindow).__COMPASS_E2E_HOOKS__?.setAuthenticated(true);
  });

  // useSSEConnection.ts invalidates the calendars query when `authenticated`
  // flips; wait for that refetch to land before handing control to the test.
  await expect(
    page
      .locator("#sidebar")
      .getByRole("button", { name: /calendar$/ })
      .first(),
  ).toBeVisible({
    timeout: 10000,
  });

  return harness;
}

test("sidebar lists calendars, coalesces a visibility toggle, and shows card identity", async ({
  page,
}) => {
  const harness = await setupCalendarExperiencePage(page);
  await ensureSidebarOpen(page);
  const sidebar = page.locator("#sidebar");
  const grid = page.locator("#mainGrid");

  await expect(sidebar.getByText(`${CALENDAR_A_NAME} · primary`)).toBeVisible();
  await expect(
    sidebar.getByText(`${CALENDAR_B_NAME} · read-only`),
  ).toBeVisible();
  await expect(
    sidebar.getByText(LOCAL_CALENDAR_NAME, { exact: true }),
  ).toBeVisible();

  // Identity: both cards' accessible names include their calendar's name.
  await expect(
    grid.getByRole("button", {
      name: new RegExp(`${EVENT_A_TITLE}.*${CALENDAR_A_NAME} calendar`),
    }),
  ).toBeVisible();
  await expect(
    grid.getByRole("button", {
      name: new RegExp(`${EVENT_B_TITLE}.*${CALENDAR_B_NAME} calendar`),
    }),
  ).toBeVisible();

  const toggleB = sidebar.getByRole("button", {
    name: new RegExp(`^(Show|Hide) ${CALENDAR_B_NAME} calendar$`),
  });

  await toggleB.click();
  await expect(toggleB).toHaveAttribute("aria-pressed", "false");
  await expect(grid.getByRole("button", { name: EVENT_B_TITLE })).toHaveCount(
    0,
  );
  await expect(grid.getByRole("button", { name: EVENT_A_TITLE })).toBeVisible();

  await expect.poll(() => harness.putCalls.length).toBe(1);
  expect(harness.putCalls[0]).toEqual([
    { calendarId: CALENDAR_B_ID, isVisible: false },
  ]);

  await toggleB.click();
  await expect(toggleB).toHaveAttribute("aria-pressed", "true");
  await expect(grid.getByRole("button", { name: EVENT_B_TITLE })).toBeVisible();

  await expect.poll(() => harness.putCalls.length).toBe(2);
  expect(harness.putCalls[1]).toEqual([
    { calendarId: CALENDAR_B_ID, isVisible: true },
  ]);
});

test("day view separates visible calendars into distinct columns", async ({
  page,
}) => {
  await setupCalendarExperiencePage(page);

  await page
    .getByRole("button", { name: /select view, currently week/i })
    .click();
  await page.getByRole("option", { name: /^day/i }).click();

  const dayAgenda = page.getByRole("region", { name: "Calendar agenda" });
  const calendarHeaders = dayAgenda.getByRole("region", {
    name: "Calendars",
  });
  const primaryHeader = calendarHeaders.getByText(CALENDAR_A_NAME);
  const readerHeader = calendarHeaders.getByText(CALENDAR_B_NAME);
  const primaryEvent = dayAgenda.getByRole("button", {
    name: new RegExp(`${EVENT_A_TITLE}.*${CALENDAR_A_NAME} calendar`),
  });
  const readerEvent = dayAgenda.getByRole("button", {
    name: new RegExp(`${EVENT_B_TITLE}.*${CALENDAR_B_NAME} calendar`),
  });

  await expect(primaryHeader).toBeVisible();
  await expect(readerHeader).toBeVisible();
  await expect(primaryHeader).toHaveCSS("color", "rgb(255, 255, 255)");
  await expect(readerHeader).toHaveCSS("color", "rgb(255, 255, 255)");
  await expect(primaryEvent).toBeVisible();
  await expect(readerEvent).toBeVisible();

  const [primaryHeaderBox, readerHeaderBox, primaryEventBox, readerEventBox] =
    await Promise.all([
      primaryHeader.locator("..").boundingBox(),
      readerHeader.locator("..").boundingBox(),
      primaryEvent.boundingBox(),
      readerEvent.boundingBox(),
    ]);

  expect(primaryHeaderBox).not.toBeNull();
  expect(readerHeaderBox).not.toBeNull();
  expect(primaryEventBox).not.toBeNull();
  expect(readerEventBox).not.toBeNull();
  expect(readerHeaderBox!.x).toBeGreaterThan(primaryHeaderBox!.x);
  expect(readerEventBox!.x).toBeGreaterThan(primaryEventBox!.x);
  expect(primaryEventBox!.width).toBeLessThanOrEqual(primaryHeaderBox!.width);
  expect(readerEventBox!.width).toBeLessThanOrEqual(readerHeaderBox!.width);
});

test("a new event form offers only writable calendars and supports keyboard selection", async ({
  page,
}) => {
  await setupCalendarExperiencePage(page, []);

  await openTimedEventFormWithMouse(page);
  const form = page.getByRole("form");
  // CalendarSelect's trigger is a <button aria-haspopup="listbox"
  // aria-expanded>; Chromium computes that combination as role "combobox".
  const trigger = form.getByRole("combobox", {
    name: `Calendar: ${CALENDAR_A_NAME} (primary)`,
  });
  await expect(trigger).toBeVisible();

  await trigger.click();
  // Scoped by name: the sidebar's always-visible month picker is also a
  // role="listbox" (of day options), and the two would otherwise collide.
  const listbox = page.getByRole("listbox", { name: "Calendar" });
  await expect(listbox.getByRole("option")).toHaveCount(2);
  await expect(
    listbox.getByRole("option", { name: LOCAL_CALENDAR_NAME, exact: true }),
  ).toBeVisible();
  await expect(
    listbox.getByRole("option", { name: CALENDAR_B_NAME }),
  ).toHaveCount(0);

  // Keyboard flow: Down moves off the default (primary, index 0) selection,
  // Enter commits it.
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");

  await expect(
    form.getByRole("combobox", { name: "Calendar: Local" }),
  ).toBeVisible();
});

test("a read-only event blocks a drag attempt", async ({ page }) => {
  const harness = await setupCalendarExperiencePage(page);
  const card = page
    .locator("#mainGrid")
    .getByRole("button", { name: EVENT_B_TITLE })
    .last();

  await card.scrollIntoViewIfNeeded();
  const box = await card.boundingBox();
  if (!box) {
    throw new Error("Expected the read-only event card to be visible.");
  }
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;

  // A read-only card has no interaction-registry entry (packet 08 step 8),
  // so this never becomes a real move - no mutation fires and the card
  // stays exactly where it was.
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx, cy + 80, { steps: 5 });
  await page.waitForTimeout(150);
  await page.mouse.up();
  await page.waitForTimeout(150);

  expect(harness.mutationRequests).toHaveLength(0);
  await expect(card).toBeVisible();
});

test("a read-only event opens as a read-only form", async ({ page }) => {
  const harness = await setupCalendarExperiencePage(page);
  const card = page
    .locator("#mainGrid")
    .getByRole("button", { name: EVENT_B_TITLE })
    .last();

  // Opens via the context menu's View action rather than a direct
  // left-click: the read-only card's mousedown-time open races other
  // press-cycle listeners in a real browser (~50% silent no-op; two fix
  // attempts - stopPropagation and a deferred click-time open - each moved
  // but did not close the race). Known issue recorded in the packet 08
  // close-out; keyboard ("M") and this View path are the deterministic
  // inspection routes today.
  await card.click({ button: "right" });
  await page.getByRole("menu").getByRole("button", { name: "View" }).click();

  const form = page.getByRole("form");
  const titleInput = form.getByPlaceholder("Title");
  await expect(titleInput).toHaveValue(EVENT_B_TITLE);
  await expect(titleInput).toBeDisabled();
  await expect(form.getByRole("button", { name: "Save" })).toHaveCount(0);
  await expect(form.getByRole("note")).toContainText("Read-only");
  await expect(form.getByText(`Calendar: ${CALENDAR_B_NAME}`)).toBeVisible();

  expect(harness.mutationRequests).toHaveLength(0);
});

test("a read-only event's context menu offers view and duplicate but not delete", async ({
  page,
}) => {
  await setupCalendarExperiencePage(page);
  const card = page
    .locator("#mainGrid")
    .getByRole("button", { name: EVENT_B_TITLE })
    .last();

  await card.click({ button: "right" });

  const menu = page.getByRole("menu");
  await expect(menu.getByRole("button", { name: "View" })).toBeVisible();
  await expect(menu.getByRole("button", { name: "Duplicate" })).toBeVisible();
  await expect(menu.getByRole("button", { name: "Delete" })).toHaveCount(0);
});
