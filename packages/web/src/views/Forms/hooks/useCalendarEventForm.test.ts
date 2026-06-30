import { renderHook } from "@testing-library/react";
import { act } from "react";
import { useCalendarEventForm } from "./useCalendarEventForm";
import { describe, expect, it, mock } from "bun:test";

describe("useCalendarEventForm", () => {
  it("owns the form's open state", () => {
    const { result } = renderHook(() => useCalendarEventForm());

    expect(result.current.isOpen).toBe(false);

    act(() => result.current.openForm());
    expect(result.current.isOpen).toBe(true);

    act(() => result.current.closeForm());
    expect(result.current.isOpen).toBe(false);
  });

  it("reports escape and outside-press dismissals", () => {
    const onDismiss = mock();
    const { result } = renderHook(() => useCalendarEventForm({ onDismiss }));

    act(() => result.current.openForm());
    act(() => {
      result.current.context.onOpenChange(
        false,
        new KeyboardEvent("keydown", { key: "Escape" }),
        "escape-key",
      );
    });

    expect(result.current.isOpen).toBe(false);
    expect(onDismiss).toHaveBeenCalledWith("escape-key");

    act(() => result.current.openForm());
    act(() => {
      result.current.context.onOpenChange(
        false,
        new MouseEvent("pointerdown"),
        "outside-press",
      );
    });

    expect(result.current.isOpen).toBe(false);
    expect(onDismiss).toHaveBeenLastCalledWith("outside-press");
  });
});
