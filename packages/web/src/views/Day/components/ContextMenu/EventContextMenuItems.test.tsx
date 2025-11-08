import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Schema_Event } from "@core/types/event.types";
import { deleteEventSlice } from "@web/ducks/events/slices/event.slice";
import { EventContextMenuProvider } from "./EventContextMenuContext";
import { EventContextMenuItems } from "./EventContextMenuItems";

// Mock toast
jest.mock("react-toastify", () => ({
  toast: {
    dismiss: jest.fn(),
  },
}));

// Mock showUndoDeleteToast
jest.mock("@web/views/Day/components/Toasts/UndoToast/UndoDeleteToast", () => ({
  showUndoDeleteToast: jest.fn(() => "mock-toast-id"),
}));

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
    preloadedState: {
      deleteEvent: {
        value: null,
        isLoading: false,
        error: null,
      },
    },
  });
};

describe("EventContextMenuItems", () => {
  const mockClose = jest.fn();
  const mockOnDelete = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderWithProvider = (
    event: Schema_Event,
    onDelete?: (event: Schema_Event) => void,
  ) => {
    const store = createMockStore();
    return render(
      <Provider store={store}>
        <EventContextMenuProvider onDelete={onDelete}>
          <EventContextMenuItems event={event} close={mockClose} />
        </EventContextMenuProvider>
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

    render(
      <Provider store={store}>
        <EventContextMenuProvider>
          <EventContextMenuItems event={mockEvent} close={mockClose} />
        </EventContextMenuProvider>
      </Provider>,
    );

    const deleteButton = screen.getByText("Delete Event");
    await user.click(deleteButton);

    expect(dispatchSpy).toHaveBeenCalledWith(
      deleteEventSlice.actions.request({
        _id: mockEvent._id,
        applyTo: expect.any(String),
      }),
    );
    expect(mockClose).toHaveBeenCalled();
  });

  it("should call onDelete callback when provided", async () => {
    const user = userEvent.setup();
    renderWithProvider(mockEvent, mockOnDelete);

    const deleteButton = screen.getByText("Delete Event");
    await user.click(deleteButton);

    expect(mockOnDelete).toHaveBeenCalledWith(mockEvent);
  });

  it("should handle keyboard Enter key", async () => {
    const user = userEvent.setup();
    const store = createMockStore();
    const dispatchSpy = jest.spyOn(store, "dispatch");

    render(
      <Provider store={store}>
        <EventContextMenuProvider>
          <EventContextMenuItems event={mockEvent} close={mockClose} />
        </EventContextMenuProvider>
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

    render(
      <Provider store={store}>
        <EventContextMenuProvider>
          <EventContextMenuItems event={mockEvent} close={mockClose} />
        </EventContextMenuProvider>
      </Provider>,
    );

    const deleteButton = screen.getByText("Delete Event");
    deleteButton.focus();

    fireEvent.keyDown(deleteButton, { key: " ", code: "Space" });

    expect(dispatchSpy).toHaveBeenCalled();
    expect(mockClose).toHaveBeenCalled();
  });

  it("should not delete if event has no _id", async () => {
    const user = userEvent.setup();
    const store = createMockStore();
    const dispatchSpy = jest.spyOn(store, "dispatch");

    const eventWithoutId = { ...mockEvent, _id: undefined };

    render(
      <Provider store={store}>
        <EventContextMenuProvider>
          <EventContextMenuItems event={eventWithoutId} close={mockClose} />
        </EventContextMenuProvider>
      </Provider>,
    );

    const deleteButton = screen.getByText("Delete Event");
    await user.click(deleteButton);

    expect(dispatchSpy).not.toHaveBeenCalled();
  });
});
