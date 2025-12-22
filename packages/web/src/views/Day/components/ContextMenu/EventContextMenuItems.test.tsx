import { Provider } from "react-redux";
import { BehaviorSubject } from "rxjs";
import { configureStore } from "@reduxjs/toolkit";
import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  RecurringEventUpdateScope,
  Schema_Event,
} from "@core/types/event.types";
import { closeFloatingAtCursor } from "@web/common/hooks/useOpenAtCursor";
import { deleteEventSlice } from "@web/ducks/events/slices/event.slice";
import { activeEvent$ } from "@web/store/events";
import { EventContextMenuItems } from "@web/views/Day/components/ContextMenu/EventContextMenuItems";

jest.mock("@web/store/events", () => {
  const { BehaviorSubject } = require("rxjs");
  return {
    activeEvent$: new BehaviorSubject(null),
  };
});
jest.mock("@web/common/hooks/useOpenAtCursor");

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
  const mockClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (closeFloatingAtCursor as jest.Mock).mockImplementation(mockClose);
  });

  const renderWithProvider = (event: Schema_Event) => {
    const store = createMockStore();
    (activeEvent$ as BehaviorSubject<Schema_Event | null>).next(event);
    return render(
      <Provider store={store}>
        <EventContextMenuItems />
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
    const dispatchSpy = jest.spyOn(store, "dispatch");

    (activeEvent$ as BehaviorSubject<Schema_Event | null>).next(mockEvent);

    render(
      <Provider store={store}>
        <EventContextMenuItems />
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
    const dispatchSpy = jest.spyOn(store, "dispatch");

    (activeEvent$ as BehaviorSubject<Schema_Event | null>).next(mockEvent);

    render(
      <Provider store={store}>
        <EventContextMenuItems />
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
    const dispatchSpy = jest.spyOn(store, "dispatch");

    (activeEvent$ as BehaviorSubject<Schema_Event | null>).next(mockEvent);

    render(
      <Provider store={store}>
        <EventContextMenuItems />
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

  it("should not delete if event has no _id", async () => {
    const user = userEvent.setup();
    const store = createMockStore();
    const dispatchSpy = jest.spyOn(store, "dispatch");

    const eventWithoutId = { ...mockEvent, _id: undefined };

    (activeEvent$ as unknown as BehaviorSubject<any>).next(eventWithoutId);

    render(
      <Provider store={store}>
        <EventContextMenuItems />
      </Provider>,
    );

    const deleteButton = screen.getByText("Delete Event");
    await user.click(deleteButton);

    expect(dispatchSpy).not.toHaveBeenCalled();
  });
});
