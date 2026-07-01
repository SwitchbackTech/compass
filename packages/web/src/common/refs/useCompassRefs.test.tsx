import { renderHook } from "@testing-library/react";
import { type PropsWithChildren } from "react";
import { CompassRefsProvider } from "@web/common/refs/compass-refs";
import { useCompassRefs } from "@web/common/refs/useCompassRefs";

describe("useCompassRefs", () => {
  it("returns the compass refs from context", () => {
    const wrapper = ({ children }: PropsWithChildren) => (
      <CompassRefsProvider>{children}</CompassRefsProvider>
    );

    const { result } = renderHook(() => useCompassRefs(), { wrapper });

    expect(result.current.nowLineRef.current).toBeNull();
    expect(result.current.timedEventsContainerRef.current).toBeNull();
    expect(result.current.timedEventsGridRef.current).toBeNull();
    expect(result.current.allDayEventsGridRef.current).toBeNull();
  });

  it("throws when used outside CompassRefsProvider", () => {
    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    expect(() => {
      renderHook(() => useCompassRefs());
    }).toThrow(
      "useCompassRefs must be used within CompassRefsProvider and be defined.",
    );

    consoleSpy.mockRestore();
  });
});
