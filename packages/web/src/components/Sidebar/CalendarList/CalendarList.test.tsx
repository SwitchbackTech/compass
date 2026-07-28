import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  type Calendar,
  getCalendarCapabilities,
} from "@core/types/calendar.contracts";
import {
  CalendarIdSchema,
  TimeZoneSchema,
} from "@core/types/domain-primitives";
import { createStoreWrapper } from "@web/__tests__/render-with-store";
import { toNormalizedEventQueryData } from "@web/__tests__/utils/event-query-test-data";
import { createMockEvent } from "@web/__tests__/utils/factories/event.factory";
import { type ApiRequestConfig } from "@web/api/api.types";
import { BaseApi } from "@web/api/base/base.api";
import { calendarQueryKeys } from "@web/calendars/calendar.query";
import { isCalendarHidden } from "@web/calendars/calendar-visibility.storage";
import { STORAGE_KEYS } from "@web/common/constants/storage.constants";
import { persistentBrowserStore } from "@web/common/storage/browser-key-value.store";
import { createObjectIdString } from "@web/common/utils/id/object-id.util";
import { eventQueryKeys } from "@web/events/queries/event.query.keys";
import { type NormalizedEventQueryData } from "@web/events/queries/event.query.types";
import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  mock,
  spyOn,
} from "bun:test";

// mock.module is process-wide and not reliably restorable, so the real hook
// is captured up front and a flag (flipped off in afterAll) decides which
// implementation runs on each call - the same technique used in
// SidebarActions.test.tsx for useVersionCheck. This lets a file that runs
// after this one (e.g. useDraftActions.test.ts) get the real useSession back
// instead of permanently inheriting this file's mock.
const actualUseSession = (await import("@web/auth/compass/session/useSession"))
  .useSession;
let isSessionMocked = true;
const mockUseSession = mock();
mock.module("@web/auth/compass/session/useSession", () => ({
  useSession: (...args: Parameters<typeof actualUseSession>) =>
    isSessionMocked ? mockUseSession(...args) : actualUseSession(...args),
}));

const actualUseConnectGoogle = (
  await import("@web/auth/google/hooks/useConnectGoogle/useConnectGoogle")
).useConnectGoogle;
let isConnectGoogleMocked = true;
const mockUseConnectGoogle = mock(() => ({
  commandAction: null,
  isAvailable: true,
  state: "NOT_CONNECTED" as const,
}));
mock.module("@web/auth/google/hooks/useConnectGoogle/useConnectGoogle", () => ({
  useConnectGoogle: (...args: Parameters<typeof actualUseConnectGoogle>) =>
    isConnectGoogleMocked
      ? mockUseConnectGoogle(...args)
      : actualUseConnectGoogle(...args),
}));

afterAll(() => {
  isSessionMocked = false;
  isConnectGoogleMocked = false;
});

// CalendarList.tsx is already cached by the time this file runs -
// Sidebar.test.tsx imports createSidebar from "./Sidebar",
// and merely loading that file (regardless of the DI stubs it renders with)
// runs Sidebar.tsx's own top-level `import { CalendarList }`,
// binding its useSession import to whatever was active at that earlier point.
// A plain require here would return that stale instance. A cache-busted URL
// forces a fresh evaluation that re-resolves useSession against the mock
// above (same technique as useVersionCheck.test.ts).
const calendarListModuleUrl = new URL(
  `./CalendarList.tsx?test=${Math.random().toString(36).slice(2)}`,
  import.meta.url,
);
const { CalendarList } = (await import(
  calendarListModuleUrl.href
)) as typeof import("./CalendarList");

// The real header renders the account email / temporary-account CTA via its
// own auth+sync hooks (covered in CalendarListHeader.test.tsx); stub it
// here so list tests don't need those hooks mocked.
const StubHeader = () => <h2>Calendars</h2>;

const makeCalendar = (overrides: Partial<Calendar> = {}): Calendar => ({
  id: CalendarIdSchema.parse(createObjectIdString()),
  name: "Work",
  description: "",
  timeZone: TimeZoneSchema.parse("America/Denver"),
  foregroundColor: "#000000",
  backgroundColor: "#3b82f6",
  provider: "google",
  access: "owner",
  capabilities: getCalendarCapabilities("owner"),
  isPrimary: false,
  isVisible: true,
  isActive: true,
  ...overrides,
});

const renderCalendarList = (
  calendars: Calendar[],
  { authenticated = true }: { authenticated?: boolean } = {},
) => {
  mockUseSession.mockReturnValue({
    authenticated,
    setAuthenticated: () => {},
  });

  const { queryClient, wrapper } = createStoreWrapper();
  queryClient.setQueryData(calendarQueryKeys.all, calendars);

  const utils = render(<CalendarList Header={StubHeader} />, {
    wrapper,
  });

  return { queryClient, ...utils };
};

describe("CalendarList", () => {
  beforeEach(() => {
    mockUseSession.mockReturnValue({
      authenticated: true,
      setAuthenticated: () => {},
    });
  });

  afterEach(() => {
    BaseApi.defaults.adapter = undefined;
    persistentBrowserStore.remove(STORAGE_KEYS.HIDDEN_CALENDAR_IDS);
    mockUseSession.mockReturnValue({
      authenticated: false,
      setAuthenticated: () => {},
    });
  });

  it("renders active calendars with pressed buttons and hides inactive calendars", () => {
    const active = makeCalendar({ name: "Work" });
    const primary = makeCalendar({ name: "Personal", isPrimary: true });
    const readOnly = makeCalendar({
      name: "Team",
      access: "reader",
      capabilities: getCalendarCapabilities("reader"),
    });
    const inactive = makeCalendar({ name: "Archived", isActive: false });

    renderCalendarList([active, primary, readOnly, inactive]);

    expect(screen.getByText("Work")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Hide Work calendar" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Archived")).not.toBeInTheDocument();
  });

  it("relabels the primary provider calendar as 'primary' since the header already shows its name", () => {
    const primary = makeCalendar({ name: "ahab@pequod.com", isPrimary: true });

    renderCalendarList([primary]);

    expect(
      screen.getByRole("button", { name: "Hide primary calendar" }),
    ).toBeInTheDocument();
    expect(screen.getByText("primary")).toBeInTheDocument();
    expect(screen.queryByText("ahab@pequod.com")).not.toBeInTheDocument();
  });

  it("keeps the local sentinel's own name for anonymous sessions (still toggleable)", () => {
    // The anonymous synthesized local calendar is isPrimary, but must not be
    // relabeled "primary" - the header shows "Temporary account", not its name.
    // Visibility is client-owned, so the toggle stays available offline.
    const local = makeCalendar({
      name: "Compass",
      provider: "local",
      isPrimary: true,
    });

    renderCalendarList([local], { authenticated: false });

    expect(screen.getByText("Compass")).toBeInTheDocument();
    expect(screen.queryByText("primary")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Hide Compass calendar" }),
    ).toBeInTheDocument();
  });

  it("flips aria-pressed and persists hidden ids in localStorage", async () => {
    const calendarA = makeCalendar({ name: "Calendar A" });
    const calendarB = makeCalendar({ name: "Calendar B" });

    const user = userEvent.setup({ delay: null });
    renderCalendarList([calendarA, calendarB]);

    const buttonA = screen.getByRole("button", {
      name: "Hide Calendar A calendar",
    });
    const buttonB = screen.getByRole("button", {
      name: "Hide Calendar B calendar",
    });

    await user.click(buttonA);
    await waitFor(() => {
      expect(buttonA.getAttribute("aria-pressed")).toBe("false");
    });
    expect(isCalendarHidden(calendarA.id)).toBe(true);

    await user.click(buttonB);
    await waitFor(() => {
      expect(buttonB.getAttribute("aria-pressed")).toBe("false");
    });
    expect(isCalendarHidden(calendarB.id)).toBe(true);

    await user.click(buttonA);
    await waitFor(() => {
      expect(buttonA.getAttribute("aria-pressed")).toBe("true");
    });
    expect(isCalendarHidden(calendarA.id)).toBe(false);
    expect(isCalendarHidden(calendarB.id)).toBe(true);
  });

  it("keeps cached events on hide/show and only flips calendar isVisible", async () => {
    const hidden = makeCalendar({ name: "Hidden target" });
    const hiddenEvent = createMockEvent({ calendarId: hidden.id });
    const weekKey = eventQueryKeys.week({
      source: "remote",
      start: "2026-07-13T00:00:00.000Z",
      end: "2026-07-20T00:00:00.000Z",
    });
    const weekData = toNormalizedEventQueryData([hiddenEvent]);

    const user = userEvent.setup({ delay: null });
    const { queryClient } = renderCalendarList([hidden]);
    queryClient.setQueryData<NormalizedEventQueryData>(weekKey, weekData);

    // The button label derives from the cached calendar's isVisible, so
    // finding the flipped label already proves the calendars cache updated.
    await user.click(
      screen.getByRole("button", { name: "Hide Hidden target calendar" }),
    );
    expect(queryClient.getQueryData<NormalizedEventQueryData>(weekKey)).toEqual(
      weekData,
    );

    await user.click(
      screen.getByRole("button", { name: "Show Hidden target calendar" }),
    );
    expect(queryClient.getQueryData<NormalizedEventQueryData>(weekKey)).toEqual(
      weekData,
    );
  });

  it("announces failure and leaves the button pressed when storage write fails", async () => {
    const calendar = makeCalendar({ name: "Work" });
    const setSpy = spyOn(persistentBrowserStore, "set").mockReturnValue(false);

    const user = userEvent.setup({ delay: null });
    renderCalendarList([calendar]);

    const toggle = screen.getByRole("button", { name: "Hide Work calendar" });
    await user.click(toggle);

    expect(toggle.getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("status").textContent ?? "").toMatch(
      /couldn.t update calendar visibility/i,
    );
    setSpy.mockRestore();
  });

  it("is reachable by Tab and toggles on Enter and Space", async () => {
    const calendar = makeCalendar({ name: "Work" });

    const user = userEvent.setup({ delay: null });
    renderCalendarList([calendar]);

    const toggle = screen.getByRole("button", { name: "Hide Work calendar" });

    await user.tab();
    expect(document.activeElement).toBe(toggle);

    await user.keyboard("{Enter}");
    await waitFor(() => {
      expect(toggle.getAttribute("aria-pressed")).toBe("false");
    });

    await user.keyboard(" ");
    await waitFor(() => {
      expect(toggle.getAttribute("aria-pressed")).toBe("true");
    });
  });

  it("shows a loading state while calendars are pending", () => {
    BaseApi.defaults.adapter = () => new Promise(() => {});
    const { wrapper } = createStoreWrapper();

    render(<CalendarList Header={StubHeader} />, { wrapper });

    expect(screen.getByText(/loading calendars/i)).toBeInTheDocument();
  });

  it("shows an empty state when there are no calendars", () => {
    renderCalendarList([], { authenticated: false });

    expect(screen.getByText(/no calendars yet/i)).toBeInTheDocument();
  });

  it("shows an error state and recovers via retry", async () => {
    const calendar = makeCalendar({ name: "Work" });
    let shouldFail = true;
    BaseApi.defaults.adapter = async <T,>(
      config: ApiRequestConfig & { body?: unknown },
    ) => {
      if (shouldFail) throw new Error("Simulated load failure");
      return {
        config,
        data: { calendars: [calendar] } as T,
        headers: new Headers(),
        status: 200,
        statusText: "OK",
      };
    };
    const { wrapper } = createStoreWrapper();
    render(<CalendarList Header={StubHeader} />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText(/couldn.t load calendars/i)).toBeInTheDocument();
    });

    shouldFail = false;
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));

    await waitFor(() => {
      expect(screen.getByText("Work")).toBeInTheDocument();
    });
  });
});
