import { configureStore } from "@reduxjs/toolkit";
import { HotkeyManager, HotkeysProvider } from "@tanstack/react-hotkeys";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { type PropsWithChildren } from "react";
import { Provider } from "react-redux";
import { RecurringEventUpdateScope } from "@core/types/event.types";
import dayjs from "@core/util/date/dayjs";
import { createInitialState } from "@web/__tests__/utils/state/store.test.util";
import { ID_EVENT_FORM } from "@web/common/constants/web.constants";
import { pressKey } from "@web/common/utils/dom/event-emitter.util";
import {
  deleteEventSlice,
  eventsEntitiesSlice,
} from "@web/ducks/events/slices/event.slice";
import { reducers } from "@web/store/reducers";
import { DraftContext } from "@web/views/Week/components/Draft/context/DraftContext";
import { weekEventRegistry } from "@web/views/Week/interaction/registry/weekEventRegistry";
import {
  clearHoveredCalendarEventTarget,
  setHoveredCalendarEventTarget,
} from "@web/views/Week/interaction/targeting/weekCalendarEventTargeting";
import { useWeekShortcuts } from "./useWeekShortcuts";
import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";

const editableEvent = {
  _id: "event-1",
  endDate: "2026-05-20T10:00:00.000Z",
  isAllDay: false,
  startDate: "2026-05-20T09:00:00.000Z",
  title: "Editable event",
};
const editableAllDayEvent = {
  _id: "all-day-event-1",
  endDate: "2026-05-21T00:00:00.000Z",
  isAllDay: true,
  startDate: "2026-05-20T00:00:00.000Z",
  title: "Editable all-day event",
};
let pendingEventIds: string[] = [];
let repositionDraftByKeyboard = mock();

const createState = ({
  includeEditableEvent = true,
  includeAllDayEvent = false,
}: {
  includeEditableEvent?: boolean;
  includeAllDayEvent?: boolean;
} = {}) => {
  const state = createInitialState();
  const weekEventIds = [editableEvent._id];
  const entities = includeEditableEvent
    ? { [editableEvent._id]: editableEvent }
    : {};

  if (includeAllDayEvent) {
    weekEventIds.push(editableAllDayEvent._id);
    entities[editableAllDayEvent._id] = editableAllDayEvent;
  }

  state.events.entities!.value = entities;
  state.events.getWeekEvents!.value = {
    count: weekEventIds.length,
    data: weekEventIds,
    pageSize: weekEventIds.length,
  };
  state.events.pendingEvents!.eventIds = pendingEventIds;
  return state;
};

const createStore = (options?: {
  includeEditableEvent?: boolean;
  includeAllDayEvent?: boolean;
}) =>
  configureStore({
    preloadedState: createState(options),
    reducer: reducers,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        immutableCheck: false,
        serializableCheck: false,
        thunk: false,
      }),
  });

beforeEach(() => {
  HotkeyManager.resetInstance();
  repositionDraftByKeyboard = mock();
});

afterEach(() => {
  clearHoveredCalendarEventTarget();
  cleanup();
  document.body.innerHTML = "";
  pendingEventIds = [];
  weekEventRegistry.clear();
});

const addCalendarTarget = (
  eventId = editableEvent._id,
  eventType: "all-day" | "timed" = "timed",
) => {
  const button = document.createElement("button");
  Object.defineProperty(button, "offsetParent", {
    configurable: true,
    get: () => document.body,
  });
  document.body.appendChild(button);
  weekEventRegistry.register({
    element: button,
    eventId,
    eventType,
  });
  return button;
};

const renderShortcuts = (options?: {
  includeEditableEvent?: boolean;
  includeAllDayEvent?: boolean;
}) => {
  const store = createStore(options);
  const dispatchedActions: unknown[] = [];
  const originalDispatch = store.dispatch;

  store.dispatch = ((action) => {
    dispatchedActions.push(action);
    return originalDispatch(action);
  }) as typeof store.dispatch;

  function wrapper({ children }: PropsWithChildren) {
    return (
      <HotkeysProvider>
        <Provider store={store}>
          <DraftContext.Provider
            value={
              {
                actions: { repositionDraftByKeyboard },
                confirmation: {},
                setters: {},
                state: {},
              } as never
            }
          >
            {children}
          </DraftContext.Provider>
        </Provider>
      </HotkeysProvider>
    );
  }

  renderHook(
    () =>
      useWeekShortcuts({
        endOfView: dayjs("2026-05-24T00:00:00.000"),
        isCurrentWeek: true,
        scrollUtil: { scrollToNow: mock() } as never,
        startOfView: dayjs("2026-05-18T00:00:00.000"),
        util: {
          decrementWeek: mock(),
          getLastNavigationSource: mock(),
          goToToday: mock(),
          incrementWeek: mock(),
        },
      }),
    { wrapper },
  );

  return { dispatchedActions, store };
};

describe("useWeekShortcuts calendar event targeting", () => {
  it("focuses the first visible calendar event with I", async () => {
    const button = addCalendarTarget();

    renderShortcuts();
    pressKey("I");

    await waitFor(() => {
      expect(document.activeElement).toBe(button);
    });
  });

  it("edits the focused calendar event with M", async () => {
    const button = addCalendarTarget();
    button.focus();

    const { store } = renderShortcuts();
    pressKey("M");

    await waitFor(() => {
      expect(store.getState().events.draft?.status?.activity).toBe(
        "keyboardEdit",
      );
    });
    expect(store.getState().events.draft?.event?._id).toBe("event-1");
    expect(store.getState().events.draft?.event).toHaveProperty("position");
  });

  it("edits the prepared all-day calendar event with M", async () => {
    const button = addCalendarTarget(editableAllDayEvent._id, "all-day");
    button.focus();

    const { store } = renderShortcuts({ includeAllDayEvent: true });
    pressKey("M");

    await waitFor(() => {
      expect(store.getState().events.draft?.status?.activity).toBe(
        "keyboardEdit",
      );
    });
    expect(store.getState().events.draft?.event?._id).toBe("all-day-event-1");
    expect(store.getState().events.draft?.event).toHaveProperty("position");
  });

  it("edits the hovered calendar event with M when no event is focused", async () => {
    const button = addCalendarTarget();
    setHoveredCalendarEventTarget(button);

    const { store } = renderShortcuts();
    pressKey("M");

    await waitFor(() => {
      expect(store.getState().events.draft?.status?.activity).toBe(
        "keyboardEdit",
      );
    });
    expect(store.getState().events.draft?.event?._id).toBe("event-1");
  });

  it("does not edit pending calendar events with M", () => {
    pendingEventIds = ["event-1"];
    const button = addCalendarTarget();
    button.focus();

    const { store } = renderShortcuts();
    pressKey("M");

    expect(store.getState().events.draft?.status?.activity).toBeNull();
  });

  it("edits an event loaded after shortcuts are registered", async () => {
    const button = addCalendarTarget();
    button.focus();

    const { store } = renderShortcuts({ includeEditableEvent: false });
    await act(async () => {
      store.dispatch(
        eventsEntitiesSlice.actions.insert({
          [editableEvent._id]: editableEvent,
        }),
      );
    });
    pressKey("M");

    await waitFor(() => {
      expect(store.getState().events.draft?.status?.activity).toBe(
        "keyboardEdit",
      );
    });
    expect(store.getState().events.draft?.event?._id).toBe("event-1");
  });

  it("moves the active shortcut-created draft with arrow keys", () => {
    renderShortcuts();

    pressKey("ArrowRight");

    expect(repositionDraftByKeyboard).toHaveBeenCalledWith("ArrowRight");
  });

  it("lets editable fields keep normal arrow-key behavior", () => {
    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();
    renderShortcuts();

    pressKey("ArrowRight", {}, input);

    expect(repositionDraftByKeyboard).not.toHaveBeenCalled();
  });

  it("moves the draft when arrow keys are pressed from a non-text event form control", () => {
    const form = document.createElement("form");
    form.setAttribute("name", ID_EVENT_FORM);
    const button = document.createElement("button");
    form.appendChild(button);
    document.body.appendChild(form);
    button.focus();
    renderShortcuts();

    pressKey("ArrowRight", {}, button);

    expect(repositionDraftByKeyboard).toHaveBeenCalledWith("ArrowRight");
  });

  it("deletes the focused timed calendar event with Delete", () => {
    const confirm = mock(() => true);
    window.confirm = confirm;
    const button = addCalendarTarget();
    button.focus();

    const { dispatchedActions } = renderShortcuts();
    pressKey("Delete");

    expect(confirm).toHaveBeenCalledWith("Delete Editable event?");
    expect(dispatchedActions).toContainEqual(
      deleteEventSlice.actions.request({
        _id: "event-1",
        applyTo: RecurringEventUpdateScope.THIS_EVENT,
      }),
    );
  });

  it("deletes the focused all-day calendar event with Delete", () => {
    const confirm = mock(() => true);
    window.confirm = confirm;
    const button = addCalendarTarget(editableAllDayEvent._id, "all-day");
    button.focus();

    const { dispatchedActions } = renderShortcuts({ includeAllDayEvent: true });
    pressKey("Delete");

    expect(confirm).toHaveBeenCalledWith("Delete Editable all-day event?");
    expect(dispatchedActions).toContainEqual(
      deleteEventSlice.actions.request({
        _id: "all-day-event-1",
        applyTo: RecurringEventUpdateScope.THIS_EVENT,
      }),
    );
  });

  it("deletes the hovered calendar event with Delete when no event is focused", () => {
    const confirm = mock(() => true);
    window.confirm = confirm;
    const button = addCalendarTarget();
    setHoveredCalendarEventTarget(button);

    const { dispatchedActions } = renderShortcuts();
    pressKey("Delete");

    expect(confirm).toHaveBeenCalledWith("Delete Editable event?");
    expect(dispatchedActions).toContainEqual(
      deleteEventSlice.actions.request({
        _id: "event-1",
        applyTo: RecurringEventUpdateScope.THIS_EVENT,
      }),
    );
  });

  it("does not delete pending calendar events with Delete", () => {
    const confirm = mock(() => true);
    window.confirm = confirm;
    pendingEventIds = ["event-1"];
    const button = addCalendarTarget();
    button.focus();

    const { dispatchedActions } = renderShortcuts();
    pressKey("Delete");

    expect(confirm).not.toHaveBeenCalled();
    expect(dispatchedActions).not.toContainEqual(
      expect.objectContaining({
        type: deleteEventSlice.actions.request.type,
      }),
    );
  });

  it("does not delete calendar events when Delete is pressed inside an editable field", () => {
    const confirm = mock(() => true);
    window.confirm = confirm;
    addCalendarTarget();
    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();

    const { dispatchedActions } = renderShortcuts();
    pressKey("Delete", {}, input);

    expect(confirm).not.toHaveBeenCalled();
    expect(dispatchedActions).not.toContainEqual(
      expect.objectContaining({
        type: deleteEventSlice.actions.request.type,
      }),
    );
  });

  it("does not delete a grid event when Delete is pressed inside an open event form", () => {
    const confirm = mock(() => true);
    window.confirm = confirm;
    addCalendarTarget();

    const form = document.createElement("form");
    form.setAttribute("name", ID_EVENT_FORM);
    const button = document.createElement("button");
    form.appendChild(button);
    document.body.appendChild(form);
    button.focus();

    const { dispatchedActions } = renderShortcuts();
    pressKey("Delete", {}, button);

    expect(confirm).not.toHaveBeenCalled();
    expect(dispatchedActions).not.toContainEqual(
      expect.objectContaining({
        type: deleteEventSlice.actions.request.type,
      }),
    );
  });
});
