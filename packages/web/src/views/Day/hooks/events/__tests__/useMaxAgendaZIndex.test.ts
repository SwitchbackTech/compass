import { act } from "react";
import { renderHook } from "@testing-library/react";
import { maxAgendaZIndex$ } from "@web/views/Day/context/MaxAgendaZIndexContext";
import { useMaxAgendaZIndex } from "@web/views/Day/hooks/events/useMaxAgendaZIndex";

describe("useMaxAgendaZIndex", () => {
  it("should return the initial max z-index", () => {
    const { result } = renderHook(() => useMaxAgendaZIndex());
    expect(result.current).toBe(maxAgendaZIndex$.getValue());
  });

  it("should update when maxAgendaZIndex$ emits a new value", () => {
    const { result } = renderHook(() => useMaxAgendaZIndex());

    act(() => {
      maxAgendaZIndex$.next(20);
    });

    expect(result.current).toBe(20);
  });
});
