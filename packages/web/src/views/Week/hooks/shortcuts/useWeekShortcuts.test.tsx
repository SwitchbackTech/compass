import { configureStore } from "@reduxjs/toolkit";
import { HotkeyManager, HotkeysProvider } from "@tanstack/react-hotkeys";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { type PropsWithChildren } from "react";
import { Provider } from "react-redux";
import dayjs from "@core/util/date/dayjs";
import { createInitialState } from "@web/__tests__/utils/state/store.test.util";
import { pressKey } from "@web/common/utils/dom/event-emitter.util";
import { eventsEntitiesSlice } from "@web/ducks/events/slices/event.slice";
import { reducers } from "@web/store/reducers";
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
});

afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
  pendingEventIds = [];
});

const addCalendarTarget = (eventId = editableEvent._id) => {
  const button = document.createElement("button");
  button.dataset.calendarEventTarget = "true";
  button.dataset.calendarEventType = "timed";
  button.dataset.eventId = eventId;
  Object.defineProperty(button, "offsetParent", {
    configurable: true,
    get: () => document.body,
  });
  document.body.appendChild(button);
  return button;
};

const renderShortcuts = (options?: { includeEditableEvent?: boolean }) => {
  const store = createStore(options);

  function wrapper({ children }: PropsWithChildren) {
    return (
      <HotkeysProvider>
        <Provider store={store}>{children}</Provider>
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
    button.dataset.calendarEventHovered = "true";

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
});
