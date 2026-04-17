import { fireEvent, render } from "@testing-library/react";
import { type MouseEvent as ReactMouseEvent, type ReactNode } from "react";
import { beforeEach, describe, expect, it, mock } from "bun:test";

const usePointerPosition = mock();

mock.module("@web/common/hooks/usePointerPosition", () => ({
  usePointerPosition,
}));

type MockResizeStart = (
  event: ReactMouseEvent<HTMLButtonElement>,
  direction: "right",
  element: null,
) => void;

type MockResizeStop = (
  event: ReactMouseEvent<HTMLButtonElement>,
  direction: "right",
  element: null,
  delta: null,
) => void;

mock.module("re-resizable", () => ({
  Resizable: ({
    children,
    onResizeStart,
    onResizeStop,
  }: {
    children: ReactNode;
    onResizeStart?: MockResizeStart;
    onResizeStop?: MockResizeStop;
  }) => (
    <div>
      <button
        type="button"
        data-testid="resize-start"
        onClick={(e) => onResizeStart?.(e, "right", null)}
      >
        Start
      </button>
      <button
        type="button"
        data-testid="resize-stop"
        onClick={(e) => onResizeStop?.(e, "right", null, null)}
      >
        Stop
      </button>
      {children}
    </div>
  ),
}));

const { Resizable } = require("./Resizable") as typeof import("./Resizable");

describe("Resizable", () => {
  const mockTogglePointerMovementTracking = mock();

  beforeEach(() => {
    usePointerPosition.mockClear();
    usePointerPosition.mockReturnValue({
      togglePointerMovementTracking: mockTogglePointerMovementTracking,
    });
    mockTogglePointerMovementTracking.mockClear();
  });

  it("calls togglePointerMovementTracking with true on resize start", () => {
    const { getByTestId } = render(
      <Resizable id="test-id" defaultSize={{ width: 100, height: 100 }}>
        <div>Content</div>
      </Resizable>,
    );

    fireEvent.click(getByTestId("resize-start"));
    expect(mockTogglePointerMovementTracking).toHaveBeenCalledWith(true);
  });

  it("calls togglePointerMovementTracking with false on resize stop", () => {
    const { getByTestId } = render(
      <Resizable id="test-id" defaultSize={{ width: 100, height: 100 }}>
        <div>Content</div>
      </Resizable>,
    );

    fireEvent.click(getByTestId("resize-stop"));
    expect(mockTogglePointerMovementTracking).toHaveBeenCalledWith(false);
  });
});
