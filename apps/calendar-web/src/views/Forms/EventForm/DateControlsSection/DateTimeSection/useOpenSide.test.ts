import { renderHook } from "@testing-library/react";
import { act } from "react";
import { useOpenSide } from "./useOpenSide";
import { describe, expect, it } from "bun:test";

describe("useOpenSide", () => {
  it("opens one side at a time", () => {
    const { result } = renderHook(() => useOpenSide());

    expect(result.current.openSide).toBeNull();

    act(() => result.current.open("start"));
    expect(result.current.openSide).toBe("start");

    act(() => result.current.open("end"));
    expect(result.current.openSide).toBe("end");
  });

  it("ignores a close from the side that is not open", () => {
    const { result } = renderHook(() => useOpenSide());

    act(() => result.current.open("end"));
    act(() => result.current.close("start"));

    expect(result.current.openSide).toBe("end");
  });

  it("closes the open side", () => {
    const { result } = renderHook(() => useOpenSide());

    act(() => result.current.open("start"));
    act(() => result.current.close("start"));

    expect(result.current.openSide).toBeNull();
  });

  it("reports whether closeAll had anything to close", () => {
    const { result } = renderHook(() => useOpenSide());

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

  it("keeps its callbacks stable across renders", () => {
    const { result, rerender } = renderHook(() => useOpenSide());
    const first = result.current;

    act(() => result.current.open("start"));
    rerender();

    expect(result.current.open).toBe(first.open);
    expect(result.current.close).toBe(first.close);
    expect(result.current.closeAll).toBe(first.closeAll);
  });
});
