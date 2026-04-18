import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMockStandaloneEvent } from "@core/util/test/ccal.event.factory";
import { type ReactElement } from "react";
import {
  createInitialState,
  type InitialReduxState,
} from "@web/__tests__/utils/state/store.test.util";
import { type Schema_GridEvent } from "@web/common/types/web.event.types";
import { theme } from "@web/common/styles/theme";
import { gridEventDefaultPosition } from "@web/common/utils/event/event.util";
import { ThemeProvider } from "styled-components";
import { afterAll, beforeEach, describe, expect, it, mock } from "bun:test";

const mockClose = mock();
const mockOpenForm = mock();
const mockDuplicateEvent = mock();
const mockSetDraft = mock();
const mockSubmit = mock();
const mockOnDelete = mock();

mock.module(
  "@web/views/Calendar/components/Draft/context/useDraftContext",
  () => ({
    useDraftContext: () => ({
      actions: {
        openForm: mockOpenForm,
        duplicateEvent: mockDuplicateEvent,
        submit: mockSubmit,
      },
      setters: {
        setDraft: mockSetDraft,
      },
      confirmation: {
        onDelete: mockOnDelete,
      },
    }),
  }),
);

mock.module(
  "@web/views/Calendar/components/Draft/sidebar/context/useSidebarContext",
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

mock.module("@web/store/store.hooks", () => ({
  useAppSelector: (selector: (state: InitialReduxState) => unknown) =>
    selector(currentState),
}));

const { ContextMenuItems } =
  require("./ContextMenuItems") as typeof import("./ContextMenuItems");

const renderWithTheme = (ui: ReactElement) =>
  render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);

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

    const editButton = screen.getByText("Edit");
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

    const deleteButton = screen.getByText("Delete");
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

    const editButton = screen.getByText("Edit");
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

    const duplicateButton = screen.getByText("Duplicate");
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

    const deleteButton = screen.getByText("Delete").closest("li");
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

    const deleteButton = screen.getByText("Delete");
    await user.click(deleteButton);

    // Delete should be called for non-pending events even if others are pending
    expect(mockOnDelete).toHaveBeenCalled();
    expect(mockClose).toHaveBeenCalled();
  });
});

afterAll(() => {
  mock.restore();
});
