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
import { createMockEvent } from "@web/__tests__/utils/factories/event.factory";
import { type ApiRequestConfig } from "@web/api/api.types";
import { BaseApi } from "@web/api/base/base.api";
import { calendarQueryKeys } from "@web/calendars/calendar.query";
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

afterAll(() => {
  isSessionMocked = false;
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
  {
    authenticated = true,
    coalesceDelayMs,
  }: { authenticated?: boolean; coalesceDelayMs?: number } = {},
) => {
  mockUseSession.mockReturnValue({
    authenticated,
    setAuthenticated: () => {},
  });

  const { queryClient, wrapper } = createStoreWrapper();
  queryClient.setQueryData(calendarQueryKeys.all, calendars);

  const utils = render(
    <CalendarList coalesceDelayMs={coalesceDelayMs} Header={StubHeader} />,
    {
      wrapper,
    },
  );

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

  it("hides the visibility toggle for anonymous sessions and keeps the local sentinel's own name", () => {
    // The anonymous synthesized local calendar is isPrimary, but must not be
    // relabeled "primary" - the header shows "Temporary account", not its name.
    const local = makeCalendar({
      name: "Compass",
      provider: "local",
      isPrimary: true,
    });

    renderCalendarList([local], { authenticated: false });

    expect(screen.getByText("Compass")).toBeInTheDocument();
    expect(screen.queryByText("primary")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("flips aria-pressed optimistically and coalesces rapid toggles into one final call", async () => {
    const calendarA = makeCalendar({ name: "Calendar A" });
    const calendarB = makeCalendar({ name: "Calendar B" });
    // Method-aware: a successful flush invalidates the calendars query, which
    // (since it's actively observed here) triggers a real GET refetch through
    // this same adapter. That refetch is an expected side effect of the hook,
    // not what this test is verifying, so only PUT /calendars/select calls
    // are counted below.
    const putCalls: unknown[] = [];
    BaseApi.defaults.adapter = async <T,>(
      config: ApiRequestConfig & { body?: unknown },
    ) => {
      if (config.method === "PUT") {
        putCalls.push(config.body);
        return {
          config,
          data: undefined as T,
          headers: new Headers(),
          status: 204,
          statusText: "No Content",
        };
      }
      return {
        config,
        data: { calendars: [] } as T,
        headers: new Headers(),
        status: 200,
        statusText: "OK",
      };
    };

    const user = userEvent.setup({ delay: null });
    renderCalendarList([calendarA, calendarB], { coalesceDelayMs: 100 });

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

    await user.click(buttonB);
    await waitFor(() => {
      expect(buttonB.getAttribute("aria-pressed")).toBe("false");
    });

    await user.click(buttonA);
    await waitFor(() => {
      expect(buttonA.getAttribute("aria-pressed")).toBe("true");
    });

    await waitFor(() => {
      expect(putCalls).toHaveLength(1);
    }, { timeout: 3000 });

    const body = putCalls[0] as { calendarId: string; isVisible: boolean }[];
    expect(body).toHaveLength(2);
    expect(body).toContainEqual({
      calendarId: calendarA.id,
      isVisible: true,
    });
    expect(body).toContainEqual({
      calendarId: calendarB.id,
      isVisible: false,
    });
  });

  it("removes the hidden calendar's events from a cached week query immediately on toggle-off", async () => {
    const hidden = makeCalendar({ name: "Hidden target" });
    const kept = makeCalendar({ name: "Kept" });
    const hiddenEvent = createMockEvent({ calendarId: hidden.id });
    const keptEvent = createMockEvent({ calendarId: kept.id });
    const weekKey = eventQueryKeys.week({
      source: "remote",
      start: "2026-07-13T00:00:00.000Z",
      end: "2026-07-20T00:00:00.000Z",
    });

    const user = userEvent.setup({ delay: null });
    const { queryClient } = renderCalendarList([hidden, kept], {
      coalesceDelayMs: 100,
    });
    queryClient.setQueryData<NormalizedEventQueryData>(weekKey, {
      ids: [hiddenEvent.id, keptEvent.id],
      entities: { [hiddenEvent.id]: hiddenEvent, [keptEvent.id]: keptEvent },
    });

    await user.click(
      screen.getByRole("button", { name: "Hide Hidden target calendar" }),
    );

    const cached = queryClient.getQueryData<NormalizedEventQueryData>(weekKey);
    expect(cached?.ids).toEqual([keptEvent.id]);
    expect(cached?.entities[hiddenEvent.id]).toBeUndefined();
    expect(cached?.entities[keptEvent.id]).toBeDefined();
  });

  it("rolls back the visibility button and announces failure when the flush rejects", async () => {
    const calendar = makeCalendar({ name: "Work" });
    BaseApi.defaults.adapter = mock(async () => {
      throw new Error("Simulated network failure");
    });

    const user = userEvent.setup({ delay: null });
    renderCalendarList([calendar], { coalesceDelayMs: 100 });

    const toggle = screen.getByRole("button", { name: "Hide Work calendar" });
    await user.click(toggle);
    await waitFor(() => {
      expect(toggle.getAttribute("aria-pressed")).toBe("false");
    });

    await waitFor(() => {
      expect(toggle.getAttribute("aria-pressed")).toBe("true");
    });
    expect(screen.getByRole("status").textContent ?? "").toMatch(
      /couldn.t update calendar visibility/i,
    );
  });

  it("is reachable by Tab and toggles on Enter and Space", async () => {
    const calendar = makeCalendar({ name: "Work" });
    BaseApi.defaults.adapter = async <T,>(
      config: ApiRequestConfig & { body?: unknown },
    ) => ({
      config,
      data: (config.method === "PUT" ? undefined : { calendars: [] }) as T,
      headers: new Headers(),
      status: config.method === "PUT" ? 204 : 200,
      statusText: config.method === "PUT" ? "No Content" : "OK",
    });

    const user = userEvent.setup({ delay: null });
    renderCalendarList([calendar], { coalesceDelayMs: 100 });

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
    renderCalendarList([]);

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
