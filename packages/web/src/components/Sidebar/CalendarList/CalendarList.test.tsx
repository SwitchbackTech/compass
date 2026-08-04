import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  type Calendar,
  getCalendarCapabilities,
} from "@core/types/calendar.contracts";
import {
  CalendarIdSchema,
  TimeZoneSchema,
} from "@core/types/domain-primitives";
import { type GoogleSyncConnectionSummary } from "@core/types/user.types";
import { createStoreWrapper } from "@web/__tests__/render-with-store";
import { toNormalizedEventQueryData } from "@web/__tests__/utils/event-query-test-data";
import { createMockEvent } from "@web/__tests__/utils/factories/event.factory";
import { type ApiRequestConfig } from "@web/api/api.types";
import { BaseApi } from "@web/api/base/base.api";
import { userMetadataActions } from "@web/auth/state/user-metadata.store";
import { calendarQueryKeys } from "@web/calendars/calendar.query";
import { isCalendarHidden } from "@web/calendars/calendar-visibility.storage";
import { getStoredDefaultCalendarId } from "@web/calendars/default-calendar.store";
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
// Mirrors the real hook's one behavior these tests depend on: scoping to a
// connection reports that account's own state. (The real scoping is covered
// directly in useConnectGoogle.scope.test.tsx.) Restored in beforeEach, since
// a test that swaps in mockReturnValue would otherwise poison later ones.
const defaultUseConnectGoogle = (
  options?: Parameters<typeof actualUseConnectGoogle>[0],
) => ({
  commandAction: null,
  connect: mock(),
  isAvailable: true,
  isConnecting: false,
  state: options?.connection?.connectionState ?? ("NOT_CONNECTED" as const),
});
const mockUseConnectGoogle = mock(defaultUseConnectGoogle);
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

const makeConnection = (
  accountEmail: string,
  overrides: Partial<GoogleSyncConnectionSummary> = {},
): GoogleSyncConnectionSummary => ({
  id: createObjectIdString(),
  state: "healthy",
  stateReason: null,
  lastSyncedAt: null,
  lastHealthyAt: null,
  accountEmail,
  connectionState: "HEALTHY",
  ...overrides,
});

const renderCalendarList = (
  calendars: Calendar[],
  {
    authenticated = true,
    connections,
  }: {
    authenticated?: boolean;
    connections?: GoogleSyncConnectionSummary[];
  } = {},
) => {
  mockUseSession.mockReturnValue({
    authenticated,
    setAuthenticated: () => {},
  });

  if (connections) {
    userMetadataActions.set({
      google: { connectionState: "HEALTHY", connections },
    });
  }

  const { queryClient, wrapper } = createStoreWrapper();
  queryClient.setQueryData(calendarQueryKeys.all, calendars);

  const utils = render(<CalendarList Header={StubHeader} />, {
    wrapper,
  });

  return { queryClient, ...utils };
};

describe("CalendarList", () => {
  beforeEach(() => {
    mockUseConnectGoogle.mockImplementation(defaultUseConnectGoogle);
    mockUseSession.mockReturnValue({
      authenticated: true,
      setAuthenticated: () => {},
    });
  });

  afterEach(() => {
    BaseApi.defaults.adapter = undefined;
    // Storage clearing + the hidden-ids store resync are both handled by the
    // global test-lifecycle afterEach (resetBrowserState + resetAllStores).
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

    const hideButton = screen.getByRole("button", {
      name: "Hide Hidden target calendar",
    });
    await user.click(hideButton);

    // Visibility now lives in the client-owned hidden-ids store (derived by
    // the calendars query's `select`), not hand-patched onto the raw cache -
    // event queries are untouched either way.
    expect(queryClient.getQueryData<NormalizedEventQueryData>(weekKey)).toEqual(
      weekData,
    );
    expect(isCalendarHidden(hidden.id)).toBe(true);

    await user.click(
      screen.getByRole("button", { name: "Show Hidden target calendar" }),
    );
    expect(queryClient.getQueryData<NormalizedEventQueryData>(weekKey)).toEqual(
      weekData,
    );
    expect(isCalendarHidden(hidden.id)).toBe(false);
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

  it("groups calendars under a labelled section per account when two are connected", () => {
    const work = makeCalendar({
      name: "Work",
      accountEmail: "ahab@pequod.com",
    });
    const personal = makeCalendar({
      name: "Personal",
      accountEmail: "ahab@gmail.com",
    });

    renderCalendarList([work, personal], {
      connections: [
        makeConnection("ahab@pequod.com"),
        makeConnection("ahab@gmail.com"),
      ],
    });

    expect(
      screen.getByRole("region", { name: "Calendars for ahab@pequod.com" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: "Calendars for ahab@gmail.com" }),
    ).toBeInTheDocument();
    // Each account's calendars live under its own section, not one flat list.
    expect(
      within(
        screen.getByRole("region", { name: "Calendars for ahab@pequod.com" }),
      ).getByText("Work"),
    ).toBeInTheDocument();
    expect(
      within(
        screen.getByRole("region", { name: "Calendars for ahab@gmail.com" }),
      ).getByText("Personal"),
    ).toBeInTheDocument();
  });

  it("orders sections by connection order, not calendar order", () => {
    const gmail = makeCalendar({
      name: "Personal",
      accountEmail: "ahab@gmail.com",
    });
    const work = makeCalendar({
      name: "Work",
      accountEmail: "ahab@pequod.com",
    });

    renderCalendarList([gmail, work], {
      // pequod connected first, so its section comes first even though the
      // gmail calendar sorts ahead of it by name.
      connections: [
        makeConnection("ahab@pequod.com"),
        makeConnection("ahab@gmail.com"),
      ],
    });

    const headings = screen
      .getAllByRole("heading", { level: 3 })
      .map((heading) => heading.textContent);
    expect(headings).toEqual(["ahab@pequod.com", "ahab@gmail.com"]);
  });

  it("gives each account its own status line", () => {
    const work = makeCalendar({
      name: "Work",
      accountEmail: "ahab@pequod.com",
    });
    const personal = makeCalendar({
      name: "Personal",
      accountEmail: "ahab@gmail.com",
    });

    renderCalendarList([work, personal], {
      connections: [
        makeConnection("ahab@pequod.com"),
        // One broken account must not be hidden behind the healthy one.
        makeConnection("ahab@gmail.com", {
          state: "actionRequired",
          stateReason: "authorizationRevoked",
          connectionState: "RECONNECT_REQUIRED",
        }),
      ],
    });

    const healthy = within(
      screen.getByRole("region", { name: "Calendars for ahab@pequod.com" }),
    );
    const broken = within(
      screen.getByRole("region", { name: "Calendars for ahab@gmail.com" }),
    );
    expect(healthy.getByRole("status").textContent).toBe("Calendar connected");
    expect(broken.getByRole("status").textContent).toBe(
      "Calendar needs reconnecting",
    );
  });

  it("keeps the flat list with a single connected account", () => {
    // The list heading already names the sole account, so a labelled section
    // would just repeat it.
    const work = makeCalendar({
      name: "Work",
      accountEmail: "ahab@pequod.com",
    });

    renderCalendarList([work], {
      connections: [makeConnection("ahab@pequod.com")],
    });

    expect(
      screen.queryByRole("region", { name: /Calendars for/ }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Work")).toBeInTheDocument();
  });

  it("leaves the local calendar outside the account sections", () => {
    const work = makeCalendar({
      name: "Work",
      accountEmail: "ahab@pequod.com",
    });
    const personal = makeCalendar({
      name: "Personal",
      accountEmail: "ahab@gmail.com",
    });
    const local = makeCalendar({ name: "Compass", provider: "local" });

    renderCalendarList([work, personal, local], {
      connections: [
        makeConnection("ahab@pequod.com"),
        makeConnection("ahab@gmail.com"),
      ],
    });

    expect(screen.getByText("Compass")).toBeInTheDocument();
    for (const email of ["ahab@pequod.com", "ahab@gmail.com"]) {
      expect(
        within(
          screen.getByRole("region", { name: `Calendars for ${email}` }),
        ).queryByText("Compass"),
      ).not.toBeInTheDocument();
    }
  });

  it("stars the calendar new events go to, and moves the star on click", async () => {
    const primary = makeCalendar({ name: "Personal", isPrimary: true });
    const side = makeCalendar({ name: "Side project" });

    const user = userEvent.setup({ delay: null });
    renderCalendarList([primary, side]);

    // The derived default (the primary) starts starred.
    expect(
      screen.getByRole("button", {
        name: "primary is where new events go. Select again to undo.",
      }),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", {
        name: "Make Side project where new events go",
      }),
    );

    await waitFor(() => {
      expect(getStoredDefaultCalendarId()).toBe(side.id);
    });
    expect(
      screen.getByRole("button", {
        name: "Side project is where new events go. Select again to undo.",
      }),
    ).toBeInTheDocument();
  });

  it("clears the preference when the starred calendar is starred again", async () => {
    const primary = makeCalendar({ name: "Personal", isPrimary: true });
    const side = makeCalendar({ name: "Side project" });

    const user = userEvent.setup({ delay: null });
    renderCalendarList([primary, side]);

    await user.click(
      screen.getByRole("button", {
        name: "Make Side project where new events go",
      }),
    );
    await waitFor(() => {
      expect(getStoredDefaultCalendarId()).toBe(side.id);
    });

    await user.click(
      screen.getByRole("button", {
        name: "Side project is where new events go. Select again to undo.",
      }),
    );

    await waitFor(() => {
      expect(getStoredDefaultCalendarId()).toBeNull();
    });
    // Back to the derived default.
    expect(
      screen.getByRole("button", {
        name: "primary is where new events go. Select again to undo.",
      }),
    ).toBeInTheDocument();
  });

  it("offers no star on a calendar the user cannot write to", () => {
    const readOnly = makeCalendar({
      name: "Team",
      access: "reader",
      capabilities: getCalendarCapabilities("reader"),
    });

    renderCalendarList([readOnly]);

    expect(
      screen.queryByRole("button", { name: /where new events go/ }),
    ).not.toBeInTheDocument();
  });

  it("offers to add another account once one is connected", async () => {
    const connect = mock();
    mockUseConnectGoogle.mockReturnValue({
      commandAction: null,
      connect,
      isAvailable: true,
      isConnecting: false,
      state: "HEALTHY" as const,
    });

    const user = userEvent.setup({ delay: null });
    renderCalendarList([makeCalendar({ name: "Work" })]);

    await user.click(screen.getByRole("button", { name: "Add account" }));
    expect(connect).toHaveBeenCalledTimes(1);
  });

  it("does not offer to add an account before the first one is connected", () => {
    // The header's own Connect action covers this case.
    mockUseConnectGoogle.mockReturnValue({
      commandAction: null,
      connect: mock(),
      isAvailable: true,
      isConnecting: false,
      state: "NOT_CONNECTED" as const,
    });

    renderCalendarList([makeCalendar({ name: "Compass", provider: "local" })]);

    expect(
      screen.queryByRole("button", { name: "Add account" }),
    ).not.toBeInTheDocument();
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
