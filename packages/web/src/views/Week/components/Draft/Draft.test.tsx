import { configureStore } from "@reduxjs/toolkit";
import { render, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { Origin, Priorities } from "@core/constants/core.constants";
import { Categories_Event } from "@core/types/event.types";
import { createInitialState } from "@web/__tests__/utils/state/store.test.util";
import { ID_GRID_EVENTS_TIMED } from "@web/common/constants/web.constants";
import { type Schema_GridEvent } from "@web/common/types/web.event.types";
import { reducers } from "@web/store/reducers";
import { InteractionEngine } from "@web/views/Week/interaction/InteractionEngine";
import { DraftContext } from "./context/DraftContext";
import { describe, expect, it, mock } from "bun:test";

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

let gridDraftProps: Record<string, unknown> | null = null;

mock.module("./grid/hooks/useGridMouseMove", () => ({
  useGridMouseMove: mock(),
}));

mock.module("./grid/GridDraft", () => ({
  GridDraft: (props: Record<string, unknown>) => {
    gridDraftProps = props;
    return <div data-testid="grid-draft" />;
  },
}));

const { Draft } = require("./Draft") as typeof import("./Draft");

describe("Draft", () => {
  it("renders the grid draft from the interaction engine snapshot", async () => {
    document.body.innerHTML = `<div id="root"></div><div id="${ID_GRID_EVENTS_TIMED}"></div>`;

    const reactDraft = createDraft({ title: "React draft" });
    const engineDraft = createDraft({ title: "Engine draft" });
    const interaction = new InteractionEngine();

    interaction.startDrag(engineDraft);
    const preloadedState = createInitialState();
    preloadedState.events.draft = {
      event: engineDraft,
      status: {
        activity: "eventRightClick",
        dateToResize: null,
        eventType: Categories_Event.TIMED,
        isDrafting: true,
      },
    };
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

    render(
      <Provider store={store}>
        <DraftContext.Provider
          value={
            {
              actions: {},
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
          <Draft measurements={{} as never} weekProps={{} as never} />
        </DraftContext.Provider>
      </Provider>,
    );

    await waitFor(() => {
      expect(gridDraftProps).toMatchObject({
        draft: engineDraft,
        isDragging: true,
        isResizing: false,
      });
    });
  });
});
