import { act, renderHook } from "@testing-library/react";
import dayjs from "@core/util/date/dayjs";
import { useSyncDate } from "./useSyncDate";

describe("useSyncDate", () => {
  it("initializes with the provided date", () => {
    const initialDate = dayjs.utc("2025-01-15T00:00:00Z");
    const { result } = renderHook(() => useSyncDate(initialDate));

    const [dateInView] = result.current;
    expect(dateInView.format("YYYY-MM-DD")).toBe("2025-01-15");
  });

  it("updates when the date value changes", () => {
    const initialDate = dayjs.utc("2025-01-15T00:00:00Z");
    const { result, rerender } = renderHook(({ date }) => useSyncDate(date), {
      initialProps: { date: initialDate },
    });

    let [dateInView] = result.current;
    expect(dateInView.format("YYYY-MM-DD")).toBe("2025-01-15");

    const nextDate = dayjs.utc("2025-01-16T00:00:00Z");
    rerender({ date: nextDate });

    [dateInView] = result.current;
    expect(dateInView.format("YYYY-MM-DD")).toBe("2025-01-16");
  });

  it("does not update when the same date is passed as a new object", () => {
    const initialDate = dayjs.utc("2025-01-15T00:00:00Z");
    const { result, rerender } = renderHook(({ date }) => useSyncDate(date), {
      initialProps: { date: initialDate },
    });

    let [dateInView] = result.current;
    const firstDateInView = dateInView;
    expect(dateInView.format("YYYY-MM-DD")).toBe("2025-01-15");

    // Create a new dayjs object with the same date
    const sameDateNewObject = dayjs.utc("2025-01-15T12:00:00Z").startOf("day");
    rerender({ date: sameDateNewObject });

    [dateInView] = result.current;
    // The state should not have updated (same date value)
    expect(dateInView.format("YYYY-MM-DD")).toBe("2025-01-15");
    // The object reference should be the same (no unnecessary update)
    expect(dateInView).toBe(firstDateInView);
  });

  it("updates when date changes from same date to different date", () => {
    const initialDate = dayjs.utc("2025-01-15T00:00:00Z");
    const { result, rerender } = renderHook(({ date }) => useSyncDate(date), {
      initialProps: { date: initialDate },
    });

    let [dateInView] = result.current;
    expect(dateInView.format("YYYY-MM-DD")).toBe("2025-01-15");

    // First, pass the same date as a new object (should not update)
    const sameDateNewObject = dayjs.utc("2025-01-15T12:00:00Z").startOf("day");
    rerender({ date: sameDateNewObject });
    [dateInView] = result.current;
    expect(dateInView.format("YYYY-MM-DD")).toBe("2025-01-15");

    // Then, pass a different date (should update)
    const differentDate = dayjs.utc("2025-01-20T00:00:00Z");
    rerender({ date: differentDate });
    [dateInView] = result.current;
    expect(dateInView.format("YYYY-MM-DD")).toBe("2025-01-20");
  });

  it("handles multiple date changes correctly", () => {
    const initialDate = dayjs.utc("2025-01-15T00:00:00Z");
    const { result, rerender } = renderHook(({ date }) => useSyncDate(date), {
      initialProps: { date: initialDate },
    });

    let [dateInView] = result.current;
    expect(dateInView.format("YYYY-MM-DD")).toBe("2025-01-15");

    // Change to next day
    rerender({ date: dayjs.utc("2025-01-16T00:00:00Z") });
    [dateInView] = result.current;
    expect(dateInView.format("YYYY-MM-DD")).toBe("2025-01-16");

    // Change to previous day
    rerender({ date: dayjs.utc("2025-01-15T00:00:00Z") });
    [dateInView] = result.current;
    expect(dateInView.format("YYYY-MM-DD")).toBe("2025-01-15");

    // Change to a week later
    rerender({ date: dayjs.utc("2025-01-22T00:00:00Z") });
    [dateInView] = result.current;
    expect(dateInView.format("YYYY-MM-DD")).toBe("2025-01-22");
  });

  it("handles dates with different times but same day", () => {
    const morningDate = dayjs.utc("2025-01-15T08:00:00Z");
    const { result, rerender } = renderHook(({ date }) => useSyncDate(date), {
      initialProps: { date: morningDate },
    });

    let [dateInView] = result.current;
    expect(dateInView.format("YYYY-MM-DD")).toBe("2025-01-15");

    // Same day, different time (should not update)
    const eveningDate = dayjs.utc("2025-01-15T20:00:00Z");
    const firstDateInView = dateInView;
    rerender({ date: eveningDate });

    [dateInView] = result.current;
    // Should still be the same date
    expect(dateInView.format("YYYY-MM-DD")).toBe("2025-01-15");
    // Should be the same object reference (no update)
    expect(dateInView).toBe(firstDateInView);
  });

  it("handles timezone differences for the same calendar day", () => {
    // UTC date
    const utcDate = dayjs.utc("2025-01-15T00:00:00Z");
    const { result, rerender } = renderHook(({ date }) => useSyncDate(date), {
      initialProps: { date: utcDate },
    });

    let [dateInView] = result.current;
    expect(dateInView.format("YYYY-MM-DD")).toBe("2025-01-15");

    // Same calendar day in local timezone (if different from UTC)
    // This test ensures that dates are compared by their calendar day, not by exact timestamp
    const localDate = dayjs("2025-01-15T00:00:00").utc();
    rerender({ date: localDate });

    [dateInView] = result.current;
    // Should still be the same date
    expect(dateInView.format("YYYY-MM-DD")).toBe("2025-01-15");
  });

  it("allows manual updates via setDateInView", () => {
    const initialDate = dayjs.utc("2025-01-15T00:00:00Z");
    const { result } = renderHook(() => useSyncDate(initialDate));

    let [dateInView] = result.current;
    const [, setDateInView] = result.current;
    expect(dateInView.format("YYYY-MM-DD")).toBe("2025-01-15");

    // Manually update the date
    act(() => {
      setDateInView(dayjs.utc("2025-01-20T00:00:00Z"));
    });

    [dateInView] = result.current;
    expect(dateInView.format("YYYY-MM-DD")).toBe("2025-01-20");
  });

  it("allows functional updates via setDateInView", () => {
    const initialDate = dayjs.utc("2025-01-15T00:00:00Z");
    const { result } = renderHook(() => useSyncDate(initialDate));

    let [dateInView] = result.current;
    const [, setDateInView] = result.current;
    expect(dateInView.format("YYYY-MM-DD")).toBe("2025-01-15");

    // Use functional update
    act(() => {
      setDateInView((prev) => prev.add(1, "day"));
    });

    [dateInView] = result.current;
    expect(dateInView.format("YYYY-MM-DD")).toBe("2025-01-16");
  });
});
