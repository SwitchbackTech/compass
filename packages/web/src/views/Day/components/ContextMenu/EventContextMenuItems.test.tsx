import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { BehaviorSubject } from "rxjs";
import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  RecurringEventUpdateScope,
  type Schema_Event,
} from "@core/types/event.types";
import { deleteEventSlice } from "@web/ducks/events/slices/event.slice";
import { beforeEach, describe, expect, it, mock, spyOn } from "bun:test";

const activeEvent$ = new BehaviorSubject<Schema_Event | null>(null);
const closeFloatingAtCursor = mock();
const mockEventQuery = mock();
const resetDraft = mock();

mock.module("@web/store/events", () => ({
  activeEvent$,
  eventsStore: {
    query: mockEventQuery,
  },
  getDraft: mock(),
  resetDraft,
}));

mock.module("@web/common/hooks/useOpenAtCursor", () => ({
  closeFloatingAtCursor,
}));

const { EventContextMenuItems } =
  require("@web/views/Day/components/ContextMenu/EventContextMenuItems") as typeof import("@web/views/Day/components/ContextMenu/EventContextMenuItems");

const mockEvent: Schema_Event = {
  _id: "event-1",
  title: "Test Event",
  startDate: "2024-01-15T09:00:00Z",
  endDate: "2024-01-15T10:00:00Z",
  isAllDay: false,
};

const createMockStore = () => {
  return configureStore({
    reducer: {
      deleteEvent: deleteEventSlice.reducer,
    },
  });
};

describe("EventContextMenuItems", () => {
  const mockClose = mock();
  const confirmMock = mock(() => true);

  beforeEach(() => {
    closeFloatingAtCursor.mockImplementation(mockClose);
    confirmMock.mockClear();
    mockClose.mockClear();
    mockEventQuery.mockReset();
    resetDraft.mockClear();
    global.confirm = confirmMock as typeof global.confirm;
    mockEventQuery.mockReturnValue(mockEvent);
  });

  const renderWithProvider = (event: Schema_Event) => {
    const store = createMockStore();
    activeEvent$.next(event);
    return render(
      <Provider store={store}>
        <EventContextMenuItems id={event._id!} />
      </Provider>,
    );
  };

  it("should render delete menu item", () => {
    renderWithProvider(mockEvent);

    expect(screen.getByText("Delete Event")).toBeInTheDocument();
  });

  it("should dispatch delete action when clicked", async () => {
    const user = userEvent.setup();
    const store = createMockStore();
    const dispatchSpy = spyOn(store, "dispatch");

    activeEvent$.next(mockEvent);

    render(
      <Provider store={store}>
        <EventContextMenuItems id={mockEvent._id!} />
      </Provider>,
    );

    const deleteButton = screen.getByText("Delete Event");
    await user.click(deleteButton);

    expect(dispatchSpy).toHaveBeenCalledWith(
      deleteEventSlice.actions.request({
        _id: mockEvent._id as string,
        applyTo: RecurringEventUpdateScope.THIS_EVENT,
      }),
    );
    expect(mockClose).toHaveBeenCalled();
  });

  it("should handle keyboard Enter key", async () => {
    const store = createMockStore();
    const dispatchSpy = spyOn(store, "dispatch");

    activeEvent$.next(mockEvent);

    render(
      <Provider store={store}>
        <EventContextMenuItems id={mockEvent._id!} />
      </Provider>,
    );

    const deleteButton = screen.getByText("Delete Event");
    deleteButton.focus();

    // Use fireEvent for keyboard events as user.keyboard might not work with onKeyDown
    fireEvent.keyDown(deleteButton, { key: "Enter", code: "Enter" });

    await waitFor(() => {
      expect(dispatchSpy).toHaveBeenCalled();
    });
    expect(mockClose).toHaveBeenCalled();
  });

  it("should handle keyboard Space key", async () => {
    const store = createMockStore();
    const dispatchSpy = spyOn(store, "dispatch");

    activeEvent$.next(mockEvent);

    render(
      <Provider store={store}>
        <EventContextMenuItems id={mockEvent._id!} />
      </Provider>,
    );

    const deleteButton = screen.getByText("Delete Event");
    deleteButton.focus();

    fireEvent.keyDown(deleteButton, { key: " ", code: "Space" });

    await waitFor(() => {
      expect(dispatchSpy).toHaveBeenCalled();
    });
    expect(mockClose).toHaveBeenCalled();
  });
});
