import { act, renderHook } from "@testing-library/react";
import { type MouseEvent as ReactMouseEvent } from "react";
import { type GridEvent } from "@web/common/types/web.event.types";
import { INTERACTION_HOLD_DELAY_MS } from "@web/interaction/interaction.constants";
import { useGridEventMouseDown } from "@web/views/Week/hooks/grid/useGridEventMouseDown";
import { describe, expect, it, mock } from "bun:test";

const gridEvent = { _id: "event-1" } as GridEvent;

const pressEvent = (target: HTMLElement) =>
  ({
    stopPropagation: () => {},
    currentTarget: target,
    clientX: 10,
    clientY: 20,
  }) as unknown as ReactMouseEvent;

describe("useGridEventMouseDown", () => {
  it("removes document listeners and cancels the hold timer on unmount", () => {
    const onClick = mock(() => {});
    const onDrag = mock(() => {});
    const { result, unmount } = renderHook(() =>
      useGridEventMouseDown(onClick, onDrag, INTERACTION_HOLD_DELAY_MS),
    );

    const target = document.createElement("div");
    document.body.appendChild(target);

    act(() => {
      result.current.onMouseDown(pressEvent(target), gridEvent);
    });

    unmount();

    act(() => {
      document.dispatchEvent(
        new MouseEvent("mousemove", { clientX: 100, clientY: 100 }),
      );
      document.dispatchEvent(new MouseEvent("mouseup"));
    });

    expect(onClick).not.toHaveBeenCalled();
    expect(onDrag).not.toHaveBeenCalled();
    target.remove();
  });

  it("still clicks on a quick press and release", () => {
    const onClick = mock(() => {});
    const onDrag = mock(() => {});
    const { result } = renderHook(() =>
      useGridEventMouseDown(onClick, onDrag, INTERACTION_HOLD_DELAY_MS),
    );

    const target = document.createElement("div");
    document.body.appendChild(target);

    act(() => {
      result.current.onMouseDown(pressEvent(target), gridEvent);
    });

    act(() => {
      document.dispatchEvent(new MouseEvent("mouseup"));
    });

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onDrag).not.toHaveBeenCalled();
    target.remove();
  });
});
