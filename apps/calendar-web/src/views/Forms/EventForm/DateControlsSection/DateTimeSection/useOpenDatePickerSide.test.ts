import { renderHook } from "@testing-library/react";
import { act } from "react";
import { useOpenDatePickerSide } from "./useOpenDatePickerSide";
import { describe, expect, it } from "bun:test";

describe("useOpenDatePickerSide", () => {
  it("opens one side at a time", () => {
    const { result } = renderHook(() => useOpenDatePickerSide());

    expect(result.current.openSide).toBeNull();

    act(() => result.current.open("start"));
    expect(result.current.openSide).toBe("start");

    act(() => result.current.open("end"));
    expect(result.current.openSide).toBe("end");
  });

  it("ignores a close from the side that is not open", () => {
    const { result } = renderHook(() => useOpenDatePickerSide());

    act(() => result.current.open("end"));
    act(() => result.current.close("start"));

    expect(result.current.openSide).toBe("end");
  });

  it("closes the open side", () => {
    const { result } = renderHook(() => useOpenDatePickerSide());

    act(() => result.current.open("start"));
    act(() => result.current.close("start"));

    expect(result.current.openSide).toBeNull();
  });

  it("reports whether closeAll had anything to close", () => {
    const { result } = renderHook(() => useOpenDatePickerSide());

    let wasOpen: boolean | undefined;
    act(() => {
      wasOpen = result.current.closeAll();
    });
    expect(wasOpen).toBe(false);

    act(() => result.current.open("end"));
    act(() => {
      wasOpen = result.current.closeAll();
    });
    expect(wasOpen).toBe(true);
    expect(result.current.openSide).toBeNull();
  });
});
