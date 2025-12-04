import { act } from "react";
import {
  fireEvent,
  renderHook,
  screen,
} from "@web/__tests__/__mocks__/mock.render";
import { ID_MAIN, ID_ROOT } from "@web/common/constants/web.constants";
import { useMovementEvent } from "@web/common/hooks/useMovementEvent";

describe("useMovementEvent", () => {
  const mockHandler = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should call handler when event matches type and selector", () => {
    renderHook(() =>
      useMovementEvent({
        handler: mockHandler,
        eventTypes: ["mousedown"],
        selectors: [`div#${ID_ROOT}`],
      }),
    );

    const rootDiv = screen.getByTestId(ID_ROOT);

    act(() => fireEvent.mouseDown(rootDiv));

    expect(mockHandler).toHaveBeenCalled();
  });

  it("should not call handler when event type does not match", () => {
    renderHook(() =>
      useMovementEvent({
        handler: mockHandler,
        eventTypes: ["mouseup"],
        selectors: [`div#${ID_ROOT}`],
      }),
    );

    const rootDiv = screen.getByTestId(ID_ROOT);

    act(() => fireEvent.mouseDown(rootDiv));

    expect(mockHandler).not.toHaveBeenCalled();
  });

  it("should not call handler when selector does not match", () => {
    const mainDiv = document.createElement("div");

    mainDiv.setAttribute("id", ID_MAIN);

    renderHook(() =>
      useMovementEvent({
        handler: mockHandler,
        eventTypes: ["mousedown"],
        selectors: [`div#${ID_MAIN}`],
      }),
    );

    const rootDiv = screen.getByTestId(ID_ROOT);

    rootDiv.appendChild(mainDiv);

    act(() => fireEvent.mouseDown(rootDiv));

    expect(mockHandler).not.toHaveBeenCalled();
  });

  it("should toggle tracking when toggleMouseMovementTracking is called", () => {
    const { result } = renderHook(() =>
      useMovementEvent({
        handler: mockHandler,
        eventTypes: ["mousedown"],
      }),
    );

    const rootDiv = screen.getByTestId(ID_ROOT);

    // Pause tracking
    result.current.toggleMouseMovementTracking(true);

    act(() => fireEvent.mouseDown(rootDiv));

    expect(mockHandler).not.toHaveBeenCalled();

    // Resume tracking
    result.current.toggleMouseMovementTracking(false);

    act(() => fireEvent.mouseDown(rootDiv));

    expect(mockHandler).toHaveBeenCalled();
  });
});
