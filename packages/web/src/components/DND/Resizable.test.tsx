import { fireEvent, render } from "@testing-library/react";
import { usePointerPosition } from "@web/common/hooks/usePointerPosition";
import { Resizable } from "./Resizable";

// Mock usePointerPosition
jest.mock("@web/common/hooks/usePointerPosition");

// Mock re-resizable
jest.mock("re-resizable", () => ({
  Resizable: ({ children, onResizeStart, onResizeStop }: any) => (
    <div>
      <button
        data-testid="resize-start"
        onClick={(e) => onResizeStart && onResizeStart(e, "right", null)}
      >
        Start
      </button>
      <button
        data-testid="resize-stop"
        onClick={(e) => onResizeStop && onResizeStop(e, "right", null, null)}
      >
        Stop
      </button>
      {children}
    </div>
  ),
}));

describe("Resizable", () => {
  const mockTogglePointerMovementTracking = jest.fn();

  beforeEach(() => {
    (usePointerPosition as jest.Mock).mockReturnValue({
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
