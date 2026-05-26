import { configureStore } from "@reduxjs/toolkit";
import { HotkeyManager, HotkeysProvider } from "@tanstack/react-hotkeys";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { type PropsWithChildren } from "react";
import { Provider } from "react-redux";
import dayjs from "@core/util/date/dayjs";
import { createInitialState } from "@web/__tests__/utils/state/store.test.util";
import { pressKey } from "@web/common/utils/dom/event-emitter.util";
import {
  EVENT_FORM_TITLE_EDITING_STARTED_ATTRIBUTE,
  EVENT_FORM_TITLE_INPUT_NAME,
} from "@web/common/utils/form/form.util";
import { eventsEntitiesSlice } from "@web/ducks/events/slices/event.slice";
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
let pendingEventIds: string[] = [];
let repositionDraftByKeyboard = mock();

const createState = ({
  includeEditableEvent = true,
}: {
  includeEditableEvent?: boolean;
} = {}) => {
  const state = createInitialState();
  state.events.entities!.value = includeEditableEvent
    ? { [editableEvent._id]: editableEvent }
    : {};
  state.events.pendingEvents!.eventIds = pendingEventIds;
  return state;
};

const createStore = (options?: { includeEditableEvent?: boolean }) =>
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

const addCalendarTarget = (eventId = editableEvent._id) => {
  const button = document.createElement("button");
  Object.defineProperty(button, "offsetParent", {
    configurable: true,
    get: () => document.body,
  });
  document.body.appendChild(button);
  weekEventRegistry.register({
    element: button,
    eventId,
    eventType: "timed",
  });
  return button;
};

const renderShortcuts = (options?: { includeEditableEvent?: boolean }) => {
  const store = createStore(options);

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
        dateCalcs: {} as never,
        endOfView: dayjs("2026-05-24T00:00:00.000"),
        isCurrentWeek: true,
        scrollUtil: { scrollToNow: mock() } as never,
        startOfView: dayjs("2026-05-18T00:00:00.000"),
        today: dayjs("2026-05-20T00:00:00.000"),
        util: {
          decrementWeek: mock(),
          getLastNavigationSource: mock(),
          goToToday: mock(),
          incrementWeek: mock(),
        },
      }),
    { wrapper },
  );

  return store;
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

    const store = renderShortcuts();
    pressKey("M");

    await waitFor(() => {
      expect(store.getState().events.draft?.status?.activity).toBe(
        "keyboardEdit",
      );
    });
    expect(store.getState().events.draft?.event?._id).toBe("event-1");
  });

  it("edits the hovered calendar event with M when no event is focused", async () => {
    const button = addCalendarTarget();
    setHoveredCalendarEventTarget(button);

    const store = renderShortcuts();
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

    const store = renderShortcuts();
    pressKey("M");

    expect(store.getState().events.draft?.status?.activity).toBeNull();
  });

  it("edits an event loaded after shortcuts are registered", async () => {
    const button = addCalendarTarget();
    button.focus();

    const store = renderShortcuts({ includeEditableEvent: false });
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

  it("moves the draft from the auto-focused empty event title field", () => {
    const titleInput = document.createElement("input");
    titleInput.name = EVENT_FORM_TITLE_INPUT_NAME;
    document.body.appendChild(titleInput);
    titleInput.focus();
    renderShortcuts();

    pressKey("ArrowDown", {}, titleInput);

    expect(repositionDraftByKeyboard).toHaveBeenCalledWith("ArrowDown");
  });

  it("lets a non-empty event title field keep normal arrow-key behavior", () => {
    const titleInput = document.createElement("input");
    titleInput.name = EVENT_FORM_TITLE_INPUT_NAME;
    titleInput.value = "Planning";
    document.body.appendChild(titleInput);
    titleInput.focus();
    renderShortcuts();

    pressKey("ArrowDown", {}, titleInput);

    expect(repositionDraftByKeyboard).not.toHaveBeenCalled();
  });

  it("keeps title text editing active after the title was edited back to empty", () => {
    repositionDraftByKeyboard = mock(() => true);
    const titleInput = document.createElement("input");
    titleInput.name = EVENT_FORM_TITLE_INPUT_NAME;
    titleInput.setAttribute(EVENT_FORM_TITLE_EDITING_STARTED_ATTRIBUTE, "true");
    document.body.appendChild(titleInput);
    titleInput.focus();
    renderShortcuts();

    const event = new KeyboardEvent("keydown", {
      bubbles: true,
      cancelable: true,
      composed: true,
      key: "ArrowLeft",
    });
    titleInput.dispatchEvent(event);

    expect(repositionDraftByKeyboard).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
  });

  it("prevents browser arrow behavior only when the draft moves", () => {
    repositionDraftByKeyboard = mock(() => true);
    const titleInput = document.createElement("input");
    titleInput.name = EVENT_FORM_TITLE_INPUT_NAME;
    document.body.appendChild(titleInput);
    titleInput.focus();
    renderShortcuts();

    const event = new KeyboardEvent("keydown", {
      bubbles: true,
      cancelable: true,
      composed: true,
      key: "ArrowDown",
    });
    titleInput.dispatchEvent(event);

    expect(repositionDraftByKeyboard).toHaveBeenCalledWith("ArrowDown");
    expect(event.defaultPrevented).toBe(true);
  });
});
