import { configureStore } from "@reduxjs/toolkit";
import { QueryClient } from "@tanstack/react-query";
import userEvent from "@testing-library/user-event";
import { type ReactElement } from "react";
import { Provider } from "react-redux";
import { createMockStandaloneEvent } from "@core/util/test/ccal.event.factory";
import { render, screen } from "@web/__tests__/__mocks__/mock.render";
import {
  createInitialState,
  type InitialReduxState,
} from "@web/__tests__/utils/state/store.test.util";
import { type Schema_GridEvent } from "@web/common/types/web.event.types";
import { gridEventDefaultPosition } from "@web/common/utils/event/event.util";
import { eventMutationKeys } from "@web/ducks/events/mutations/event.mutation.keys";
import { reducers } from "@web/store/reducers";
import { DraftContext } from "@web/views/Week/components/Draft/context/DraftContext";
import { beforeEach, describe, expect, it, mock } from "bun:test";

const mockClose = mock();
const mockOpenForm = mock();
const mockDuplicateEvent = mock();
const mockSetDraft = mock();
const mockSubmit = mock();
const mockOnDelete = mock();

mock.module(
  "@web/components/PlannerSidebar/draft/context/useSidebarContext",
  () => ({
    useSidebarContext: () => null,
  }),
);

const createMockGridEvent = (
  overrides: Partial<Schema_GridEvent> = {},
): Schema_GridEvent => {
  const standaloneEvent = createMockStandaloneEvent();
  return {
    ...standaloneEvent,
    position: gridEventDefaultPosition,
    ...overrides,
  } as Schema_GridEvent;
};

const createStateWithPendingEvents = (
  pendingEventIds: string[] = [],
): InitialReduxState => {
  const baseState = createInitialState();
  return {
    ...baseState,
    events: {
      ...baseState.events,
      pendingEvents: {
        eventIds: pendingEventIds,
      },
    },
  };
};

let currentState = createStateWithPendingEvents();
currentState.auth.status = "authenticating";

const { ContextMenuItems } =
  require("./ContextMenuItems") as typeof import("./ContextMenuItems");

const renderWithTheme = (ui: ReactElement) => {
  const queryClient = new QueryClient();
  for (const eventId of currentState.events.pendingEvents?.eventIds ?? []) {
    queryClient.getMutationCache().build(
      queryClient,
      { mutationKey: eventMutationKeys.operation("edit") },
      {
        context: undefined,
        data: undefined,
        error: null,
        failureCount: 0,
        failureReason: null,
        isPaused: false,
        status: "pending",
        variables: { _id: eventId },
        submittedAt: Date.now(),
      },
    );
  }
  const store = configureStore({
    preloadedState: currentState,
    reducer: reducers,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        immutableCheck: false,
        serializableCheck: false,
        thunk: false,
      }),
  });

  return render(
    <Provider store={store}>
      <DraftContext.Provider
        value={
          {
            actions: {
              duplicateEvent: mockDuplicateEvent,
              openForm: mockOpenForm,
              repositionDraftByKeyboard: mock(() => false),
              submit: mockSubmit,
            },
            confirmation: {
              onDelete: mockOnDelete,
            },
            setters: {
              setDraft: mockSetDraft,
            },
          } as never
        }
      >
        {ui}
      </DraftContext.Provider>
    </Provider>,
    { queryClient },
  );
};

describe("ContextMenuItems", () => {
  beforeEach(() => {
    currentState = createStateWithPendingEvents();
    currentState.auth.status = "authenticating";
    mockClose.mockClear();
    mockOpenForm.mockClear();
    mockDuplicateEvent.mockClear();
    mockSetDraft.mockClear();
    mockSubmit.mockClear();
    mockOnDelete.mockClear();
  });

  it("should render menu items for non-pending event", () => {
    const event = createMockGridEvent({
      _id: "event-1",
      title: "Test Event",
    });

    renderWithTheme(<ContextMenuItems event={event} close={mockClose} />);

    expect(screen.getByText("Edit")).toBeInTheDocument();
    expect(screen.getByText("Duplicate")).toBeInTheDocument();
    expect(screen.getByText("Delete")).toBeInTheDocument();
  });

  it("should call onClick handlers for non-pending event", async () => {
    const user = userEvent.setup();
    const event = createMockGridEvent({
      _id: "event-1",
      title: "Test Event",
    });

    renderWithTheme(<ContextMenuItems event={event} close={mockClose} />);

    const editButton = screen.getByRole("button", { name: "Edit" });
    await user.click(editButton);

    expect(mockSetDraft).toHaveBeenCalled();
    expect(mockOpenForm).toHaveBeenCalled();
    expect(mockClose).toHaveBeenCalled();
  });

  it("should disable delete action for pending event", async () => {
    const user = userEvent.setup();
    const event = createMockGridEvent({
      _id: "pending-event-1",
      title: "Pending Event",
    });

    currentState = createStateWithPendingEvents(["pending-event-1"]);
    renderWithTheme(<ContextMenuItems event={event} close={mockClose} />);

    const deleteButton = screen.getByRole("button", { name: "Delete" });
    await user.click(deleteButton);

    // Delete should not be called for pending events
    expect(mockOnDelete).not.toHaveBeenCalled();
    expect(mockClose).not.toHaveBeenCalled();
  });

  it("should disable edit action for pending event", async () => {
    const user = userEvent.setup();
    const event = createMockGridEvent({
      _id: "pending-event-1",
      title: "Pending Event",
    });

    currentState = createStateWithPendingEvents(["pending-event-1"]);
    renderWithTheme(<ContextMenuItems event={event} close={mockClose} />);

    const editButton = screen.getByRole("button", { name: "Edit" });
    await user.click(editButton);

    // Edit should not be called for pending events
    expect(mockSetDraft).not.toHaveBeenCalled();
    expect(mockOpenForm).not.toHaveBeenCalled();
    expect(mockClose).not.toHaveBeenCalled();
  });

  it("should disable duplicate action for pending event", async () => {
    const user = userEvent.setup();
    const event = createMockGridEvent({
      _id: "pending-event-1",
      title: "Pending Event",
    });

    currentState = createStateWithPendingEvents(["pending-event-1"]);
    renderWithTheme(<ContextMenuItems event={event} close={mockClose} />);

    const duplicateButton = screen.getByRole("button", { name: "Duplicate" });
    await user.click(duplicateButton);

    // Duplicate should not be called for pending events
    expect(mockDuplicateEvent).not.toHaveBeenCalled();
    expect(mockClose).not.toHaveBeenCalled();
  });

  it("should apply wait cursor to delete button when pending", () => {
    const event = createMockGridEvent({
      _id: "pending-event-1",
      title: "Pending Event",
    });

    currentState = createStateWithPendingEvents(["pending-event-1"]);
    renderWithTheme(<ContextMenuItems event={event} close={mockClose} />);

    const deleteButton = screen.getByRole("button", { name: "Delete" });
    expect(deleteButton).toBeDisabled();
    expect(deleteButton).toHaveStyle({ cursor: "wait" });
  });

  it("should allow actions for non-pending event when other events are pending", async () => {
    const user = userEvent.setup();
    const event = createMockGridEvent({
      _id: "normal-event-1",
      title: "Normal Event",
    });

    currentState = createStateWithPendingEvents(["other-pending-event"]);
    renderWithTheme(<ContextMenuItems event={event} close={mockClose} />);

    const deleteButton = screen.getByRole("button", { name: "Delete" });
    await user.click(deleteButton);

    // Delete should be called for non-pending events even if others are pending
    expect(mockOnDelete).toHaveBeenCalled();
    expect(mockClose).toHaveBeenCalled();
  });

  it("uses priority buttons for pending-safe priority changes", async () => {
    const user = userEvent.setup();
    const event = createMockGridEvent({
      _id: "event-1",
      title: "Normal Event",
    });

    renderWithTheme(<ContextMenuItems event={event} close={mockClose} />);

    await user.click(
      screen.getByRole("button", { name: "Set priority to Work" }),
    );

    expect(mockSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ priority: "work" }),
    );
    expect(mockClose).toHaveBeenCalled();
  });
});
