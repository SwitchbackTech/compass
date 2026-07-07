import { act } from "react";
import dayjs from "@core/util/date/dayjs";
import { renderHook } from "@web/__tests__/__mocks__/mock.render";
import { beforeEach, describe, expect, it, mock } from "bun:test";

const DATE_FORMAT = dayjs.DateFormat.YEAR_MONTH_DAY_FORMAT;

const mockNavigate = mock();
const mockParams: { dateString?: string } = {};

// @tanstack/react-router's useNavigate/useParams are mocked directly (rather
// than relying on a real RouterProvider) because Bun's `mock.module` is
// process-wide: another test file mocking "@tanstack/react-router" can
// otherwise silently replace these hooks for every file that runs afterward
// in the same test run. See useGlobalShortcuts.test.tsx for the same pattern.
const actualTanstackRouter = await import("@tanstack/react-router");

mock.module("@tanstack/react-router", () => ({
  ...actualTanstackRouter,
  useNavigate: () => mockNavigate,
  useParams: () => mockParams,
}));

const { useWeek } = await import("./useWeek");

describe("useWeek", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockParams.dateString = undefined;
  });

  it("derives the anchor and week days from the URL date, not today", () => {
    mockParams.dateString = "2026-05-20";
    const today = dayjs("2026-07-07", DATE_FORMAT);

    const { result } = renderHook(() => useWeek(today));

    expect(result.current.component.startOfView.format(DATE_FORMAT)).toBe(
      dayjs("2026-05-20", DATE_FORMAT).startOf("week").format(DATE_FORMAT),
    );
    expect(result.current.component.isCurrentWeek).toBe(false);
    expect(
      result.current.component.weekDays.map((d) => d.format(DATE_FORMAT)),
    ).not.toContain(today.format(DATE_FORMAT));
  });

  it("falls back to today when no dateString param is present", () => {
    const today = dayjs("2026-07-07", DATE_FORMAT);

    const { result } = renderHook(() => useWeek(today));

    expect(result.current.component.isCurrentWeek).toBe(true);
  });

  it("navigates to the incremented week on incrementWeek", () => {
    mockParams.dateString = "2026-05-20";
    const today = dayjs("2026-05-20", DATE_FORMAT);
    const { result } = renderHook(() => useWeek(today));

    act(() => {
      result.current.util.incrementWeek();
    });

    expect(mockNavigate).toHaveBeenCalledWith({
      to: "/week/$dateString",
      params: { dateString: "2026-05-27" },
    });
  });

  it("navigates to the decremented week on decrementWeek", () => {
    mockParams.dateString = "2026-05-20";
    const today = dayjs("2026-05-20", DATE_FORMAT);
    const { result } = renderHook(() => useWeek(today));

    act(() => {
      result.current.util.decrementWeek();
    });

    expect(mockNavigate).toHaveBeenCalledWith({
      to: "/week/$dateString",
      params: { dateString: "2026-05-13" },
    });
  });

  it("navigates to the given date on goToDate", () => {
    mockParams.dateString = "2026-05-20";
    const today = dayjs("2026-05-20", DATE_FORMAT);
    const { result } = renderHook(() => useWeek(today));

    act(() => {
      result.current.state.goToDate(dayjs("2026-08-01", DATE_FORMAT));
    });

    expect(mockNavigate).toHaveBeenCalledWith({
      to: "/week/$dateString",
      params: { dateString: "2026-08-01" },
    });
  });

  it("navigates to today on goToToday", () => {
    mockParams.dateString = "2026-01-01";
    const today = dayjs("2026-05-20", DATE_FORMAT);
    const { result } = renderHook(() => useWeek(today));

    act(() => {
      result.current.util.goToToday();
    });

    expect(mockNavigate).toHaveBeenCalledWith({
      to: "/week/$dateString",
      params: { dateString: "2026-05-20" },
    });
  });

  it("does not navigate on goToToday when already viewing today's week", () => {
    mockParams.dateString = "2026-05-20";
    const today = dayjs("2026-05-20", DATE_FORMAT);
    const { result } = renderHook(() => useWeek(today));

    act(() => {
      result.current.util.goToToday();
    });

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("pages within a narrower visible window before crossing the week edge", () => {
    // 2026-05-20 (Wed) sits at window offset 2 in a 3-day window (Tue/Wed/Thu
    // of the Sun-start week). Paging forward by 3 days lands inside the same
    // week (offset clamps to maxOffset 4) rather than crossing into the next
    // one — that edge-crossing behavior is covered by the full-week test above.
    mockParams.dateString = "2026-05-20";
    const today = dayjs("2026-05-20", DATE_FORMAT);
    const { result } = renderHook(() => useWeek(today, 3));

    act(() => {
      result.current.util.incrementWeek();
    });

    expect(mockNavigate).toHaveBeenCalledWith({
      to: "/week/$dateString",
      params: { dateString: "2026-05-22" },
    });
  });
});
