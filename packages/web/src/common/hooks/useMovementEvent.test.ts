import { act, type ReactNode } from "react";
import { fireEvent, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, mock } from "bun:test";
import { ID_MAIN, ID_ROOT } from "@web/common/constants/web.constants";
import {
  useMovementEvent,
  useSetupMovementEvents,
} from "@web/common/hooks/useMovementEvent";

describe("useMovementEvent", () => {
  const mockHandler = mock();
  const Wrapper = ({ children }: { children: ReactNode }) => {
    useSetupMovementEvents();
    return children;
  };

  beforeEach(() => {
    mockHandler.mockClear();
    document.body.innerHTML = "";
  });

  it("should call handler when event matches type and selector", () => {
    const rootDiv = document.createElement("div");
    rootDiv.id = ID_ROOT;
    document.body.appendChild(rootDiv);

    renderHook(() =>
      useMovementEvent({
        handler: mockHandler,
        eventTypes: ["pointerdown"],
        selectors: [`div#${ID_ROOT}`],
      }),
      { wrapper: Wrapper },
    );

    act(() => fireEvent.pointerDown(rootDiv));

    expect(mockHandler).toHaveBeenCalled();
  });

  it("should not call handler when event type does not match", () => {
    const rootDiv = document.createElement("div");
    rootDiv.id = ID_ROOT;
    document.body.appendChild(rootDiv);

    renderHook(() =>
      useMovementEvent({
        handler: mockHandler,
        eventTypes: ["pointerup"],
        selectors: [`div#${ID_ROOT}`],
      }),
      { wrapper: Wrapper },
    );

    act(() => fireEvent.pointerDown(rootDiv));

    expect(mockHandler).not.toHaveBeenCalled();
  });

  it("should not call handler when selector does not match", () => {
    const mainDiv = document.createElement("div");

    mainDiv.setAttribute("id", ID_MAIN);
    document.body.appendChild(mainDiv);

    renderHook(() =>
      useMovementEvent({
        handler: mockHandler,
        eventTypes: ["pointerdown"],
        selectors: [`div#${ID_MAIN}`],
      }),
      { wrapper: Wrapper },
    );

    act(() => fireEvent.pointerDown(document.body));

    expect(mockHandler).not.toHaveBeenCalled();
  });

  it("should toggle tracking when togglePointerMovementTracking is called", () => {
    const rootDiv = document.createElement("div");
    rootDiv.id = ID_ROOT;
    document.body.appendChild(rootDiv);

    const { result } = renderHook(() =>
      useMovementEvent({
        handler: mockHandler,
        eventTypes: ["pointerdown"],
      }),
      { wrapper: Wrapper },
    );

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
