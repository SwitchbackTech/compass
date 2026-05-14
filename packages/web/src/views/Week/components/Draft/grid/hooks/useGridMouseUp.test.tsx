import { configureStore } from "@reduxjs/toolkit";
import { renderHook } from "@testing-library/react";
import { type ReactNode } from "react";
import { Provider } from "react-redux";
import { Origin, Priorities } from "@core/constants/core.constants";
import { Categories_Event } from "@core/types/event.types";
import { createInitialState } from "@web/__tests__/utils/state/store.test.util";
import { type Schema_GridEvent } from "@web/common/types/web.event.types";
import { reducers } from "@web/store/reducers";
import { DraftContext } from "@web/views/Week/components/Draft/context/DraftContext";
import { InteractionEngine } from "@web/views/Week/interaction/InteractionEngine";
import { describe, expect, it, mock } from "bun:test";

let mouseUpHandler: ((event: MouseEvent) => void) | null = null;

mock.module("@web/views/Week/hooks/mouse/useEventListener", () => ({
  useEventListener: (
    eventName: string,
    handler: (event: MouseEvent) => void,
  ) => {
    if (eventName === "mouseup") {
      mouseUpHandler = handler;
    }
  },
}));

const { useGridMouseUp } =
  require("./useGridMouseUp") as typeof import("./useGridMouseUp");

const createDraft = (
  overrides: Partial<Schema_GridEvent> = {},
): Schema_GridEvent => ({
  _id: "event-1",
  title: "React draft",
  startDate: "2024-01-15T10:00:00.000Z",
  endDate: "2024-01-15T11:30:00.000Z",
  isAllDay: false,
  isSomeday: false,
  origin: Origin.COMPASS,
  priority: Priorities.UNASSIGNED,
  user: "user-1",
  position: {
    isOverlapping: false,
    totalEventsInGroup: 1,
    widthMultiplier: 1,
    horizontalOrder: 1,
    dragOffset: { x: 0, y: 0 },
    initialX: null,
    initialY: null,
  },
  ...overrides,
});

describe("useGridMouseUp", () => {
  it("submits the latest interaction engine draft on mouse up", () => {
    document.body.innerHTML = '<div id="root"></div>';

    const reactDraft = createDraft({ title: "React draft" });
    const engineDraft = createDraft({ title: "Engine draft" });
    const interaction = new InteractionEngine();
    const submit = mock();
    const stopDragging = mock();
    const preloadedState = createInitialState();

    preloadedState.events.draft = {
      event: reactDraft,
      status: {
        activity: "dragging",
        dateToResize: null,
        eventType: Categories_Event.TIMED,
        isDrafting: true,
      },
    };
    interaction.startDrag(engineDraft);
    interaction.markDragMoved();

    const store = configureStore({
      reducer: reducers,
      preloadedState,
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
          immutableCheck: false,
          serializableCheck: false,
          thunk: false,
        }),
    });

    const wrapper = ({ children }: { children: ReactNode }) => (
      <Provider store={store}>
        <DraftContext.Provider
          value={
            {
              actions: {
                discard: mock(),
                openForm: mock(),
                stopDragging,
                stopResizing: mock(),
                submit,
              },
              confirmation: {},
              interaction,
              setters: {},
              state: {
                dateBeingChanged: "endDate",
                draft: reactDraft,
                formProps: {},
                isFormOpen: false,
                isFormOpenBeforeDragging: null,
                isResizing: false,
              },
            } as never
          }
        >
          {children}
        </DraftContext.Provider>
      </Provider>
    );

    renderHook(() => useGridMouseUp(), { wrapper });

    mouseUpHandler?.({
      button: 0,
      stopPropagation: mock(),
    } as unknown as MouseEvent);

    expect(stopDragging).not.toHaveBeenCalled();
    expect(submit).toHaveBeenCalledWith(engineDraft);
  });
});
