import { configureStore } from "@reduxjs/toolkit";
import { QueryClient } from "@tanstack/react-query";
import userEvent from "@testing-library/user-event";
import { type ReactElement } from "react";
import { Provider } from "react-redux";
import { createMockStandaloneEvent } from "@core/util/test/ccal.event.factory";
import { render, screen } from "@web/__tests__/__mocks__/mock.render";
import { seedPendingEventMutations } from "@web/__tests__/utils/event-query-test-data";
import { createInitialState } from "@web/__tests__/utils/state/store.test.util";
import { type Schema_GridEvent } from "@web/common/types/web.event.types";
import { gridEventDefaultPosition } from "@web/common/utils/event/event.util";
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

const { ContextMenuItems } =
  require("./ContextMenuItems") as typeof import("./ContextMenuItems");

const renderWithTheme = (
  ui: ReactElement,
  { pendingEventIds = [] }: { pendingEventIds?: string[] } = {},
) => {
  const queryClient = new QueryClient();
  seedPendingEventMutations(queryClient, pendingEventIds);
  const currentState = createInitialState();
  currentState.auth.status = "authenticating";
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
    mockClose.mockClear();
    mockOpenForm.mockClear();
    mockDuplicateEvent.mockClear();
    mockSetDraft.mockClear();
    mockSubmit.mockClear();
    mockOnDelete.mockClear();
  });

  it("should render menu items", () => {
    const event = createMockGridEvent({
      _id: "event-1",
      title: "Test Event",
    });

    renderWithTheme(<ContextMenuItems event={event} close={mockClose} />);

    expect(screen.getByText("Edit")).toBeInTheDocument();
    expect(screen.getByText("Duplicate")).toBeInTheDocument();
    expect(screen.getByText("Delete")).toBeInTheDocument();
  });

  it("should call onClick handlers", async () => {
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

  it("allows delete while the event's own mutation is pending", async () => {
    const user = userEvent.setup();
    const event = createMockGridEvent({
      _id: "pending-event-1",
      title: "Pending Event",
    });

    renderWithTheme(<ContextMenuItems event={event} close={mockClose} />, {
      pendingEventIds: ["pending-event-1"],
    });

    const deleteButton = screen.getByRole("button", { name: "Delete" });
    expect(deleteButton).not.toBeDisabled();
    await user.click(deleteButton);

    expect(mockOnDelete).toHaveBeenCalled();
    expect(mockClose).toHaveBeenCalled();
  });

  it("allows edit while the event's own mutation is pending", async () => {
    const user = userEvent.setup();
    const event = createMockGridEvent({
      _id: "pending-event-1",
      title: "Pending Event",
    });

    renderWithTheme(<ContextMenuItems event={event} close={mockClose} />, {
      pendingEventIds: ["pending-event-1"],
    });

    const editButton = screen.getByRole("button", { name: "Edit" });
    await user.click(editButton);

    expect(mockSetDraft).toHaveBeenCalled();
    expect(mockOpenForm).toHaveBeenCalled();
    expect(mockClose).toHaveBeenCalled();
  });

  it("allows duplicate while the event's own mutation is pending", async () => {
    const user = userEvent.setup();
    const event = createMockGridEvent({
      _id: "pending-event-1",
      title: "Pending Event",
    });

    renderWithTheme(<ContextMenuItems event={event} close={mockClose} />, {
      pendingEventIds: ["pending-event-1"],
    });

    const duplicateButton = screen.getByRole("button", { name: "Duplicate" });
    await user.click(duplicateButton);

    expect(mockDuplicateEvent).toHaveBeenCalled();
    expect(mockClose).toHaveBeenCalled();
  });

  it("does not apply a wait cursor to actions while pending", () => {
    const event = createMockGridEvent({
      _id: "pending-event-1",
      title: "Pending Event",
    });

    renderWithTheme(<ContextMenuItems event={event} close={mockClose} />, {
      pendingEventIds: ["pending-event-1"],
    });

    const deleteButton = screen.getByRole("button", { name: "Delete" });
    expect(deleteButton).not.toBeDisabled();
    expect(deleteButton).not.toHaveStyle({ cursor: "wait" });
  });

  it("changes priority via the priority buttons", async () => {
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
