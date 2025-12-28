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
        eventTypes: ["pointerdown"],
        selectors: [`div#${ID_ROOT}`],
      }),
    );

    const rootDiv = screen.getByTestId(ID_ROOT);

    act(() => fireEvent.pointerDown(rootDiv));

    expect(mockHandler).toHaveBeenCalled();
  });

  it("should not call handler when event type does not match", () => {
    renderHook(() =>
      useMovementEvent({
        handler: mockHandler,
        eventTypes: ["pointerup"],
        selectors: [`div#${ID_ROOT}`],
      }),
    );

    const rootDiv = screen.getByTestId(ID_ROOT);

    act(() => fireEvent.pointerDown(rootDiv));

    expect(mockHandler).not.toHaveBeenCalled();
  });

  it("should not call handler when selector does not match", () => {
    const mainDiv = document.createElement("div");

    mainDiv.setAttribute("id", ID_MAIN);

    renderHook(() =>
      useMovementEvent({
        handler: mockHandler,
        eventTypes: ["pointerdown"],
        selectors: [`div#${ID_MAIN}`],
      }),
    );

    const rootDiv = screen.getByTestId(ID_ROOT);

    rootDiv.appendChild(mainDiv);

    act(() => fireEvent.pointerDown(rootDiv));

    expect(mockHandler).not.toHaveBeenCalled();
  });

  it("should toggle tracking when togglePointerMovementTracking is called", () => {
    const { result } = renderHook(() =>
      useMovementEvent({
        handler: mockHandler,
        eventTypes: ["pointerdown"],
      }),
    );

    const rootDiv = screen.getByTestId(ID_ROOT);

    // Pause tracking
    result.current.togglePointerMovementTracking(true);

    act(() => fireEvent.pointerDown(rootDiv));

    expect(mockHandler).not.toHaveBeenCalled();

    // Resume tracking
    result.current.togglePointerMovementTracking(false);

    act(() => fireEvent.pointerDown(rootDiv));

    expect(mockHandler).toHaveBeenCalled();
  });
});
