import { configureStore } from "@reduxjs/toolkit";
import { act, render, waitFor } from "@testing-library/react";
import { type ReactNode } from "react";
import { Provider } from "react-redux";
import { Origin, Priorities } from "@core/constants/core.constants";
import { Categories_Event, type Schema_Event } from "@core/types/event.types";
import { createInitialState } from "@web/__tests__/utils/state/store.test.util";
import { type Schema_GridEvent } from "@web/common/types/web.event.types";
import { reducers } from "@web/store/reducers";
import { DraftContext } from "@web/views/Week/components/Draft/context/DraftContext";
import { InteractionEngine } from "@web/views/Week/interaction/InteractionEngine";
import { beforeEach, describe, expect, it, mock } from "bun:test";

let gridEventProps: {
  event: Schema_GridEvent;
  onScalerMouseDown: (
    event: Schema_GridEvent,
    e: MouseEvent,
    dateToChange: "startDate" | "endDate",
  ) => void;
} | null = null;

mock.module("../../Event/Grid/GridEvent/GridEvent", () => ({
  GridEventMemo: (props: typeof gridEventProps) => {
    gridEventProps = props;
    return <div data-testid="grid-event" />;
  },
}));

const { MainGridEvents } =
  require("./MainGridEvents") as typeof import("./MainGridEvents");

const createEvent = (overrides: Partial<Schema_Event> = {}): Schema_Event =>
  ({
    _id: "event-1",
    title: "Resize me",
    startDate: "2024-01-15T10:00:00.000Z",
    endDate: "2024-01-15T11:30:00.000Z",
    isAllDay: false,
    isSomeday: false,
    origin: Origin.COMPASS,
    priority: Priorities.UNASSIGNED,
    user: "user-1",
    ...overrides,
  }) as Schema_Event;

describe("MainGridEvents", () => {
  beforeEach(() => {
    gridEventProps = null;
  });

  it("starts the interaction engine immediately when resizing a timed event", async () => {
    const event = createEvent();
    const preloadedState = createInitialState();
    preloadedState.events.entities!.value = {
      [event._id!]: event,
    };
    preloadedState.events.getWeekEvents!.value = {
      data: [event._id!],
      count: 1,
      pageSize: 1,
      offset: 0,
      page: 1,
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
    const interaction = new InteractionEngine();
    const wrapper = ({ children }: { children: ReactNode }) => (
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
                draft: null,
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

    render(
      <MainGridEvents measurements={{} as never} weekProps={{} as never} />,
      { wrapper },
    );

    await waitFor(() => {
      expect(gridEventProps?.event._id).toBe(event._id);
    });

    const preventDefault = mock();
    const stopPropagation = mock();
    act(() => {
      gridEventProps?.onScalerMouseDown(
        gridEventProps.event,
        {
          clientX: 120,
          clientY: 240,
          preventDefault,
          stopPropagation,
        } as unknown as MouseEvent,
        "endDate",
      );
    });

    expect(stopPropagation).toHaveBeenCalled();
    expect(preventDefault).toHaveBeenCalled();
    expect(interaction.getSnapshot()).toMatchObject({
      mode: "resize",
      pointer: { x: 120, y: 240 },
      draft: { _id: event._id },
    });
    expect(store.getState().events.draft.status).toMatchObject({
      activity: "resizing",
      dateToResize: "endDate",
      eventType: Categories_Event.TIMED,
      isDrafting: true,
    });
  });
});
