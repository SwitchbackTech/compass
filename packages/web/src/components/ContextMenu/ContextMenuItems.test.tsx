import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMockStandaloneEvent } from "@core/util/test/ccal.event.factory";
import { render } from "@web/__tests__/__mocks__/mock.render";
import { createInitialState } from "@web/__tests__/utils/state/store.test.util";
import { Schema_GridEvent } from "@web/common/types/web.event.types";
import { gridEventDefaultPosition } from "@web/common/utils/event/event.util";
import { ContextMenuItems } from "./ContextMenuItems";

const mockClose = jest.fn();
const mockOpenForm = jest.fn();
const mockDuplicateEvent = jest.fn();
const mockSetDraft = jest.fn();
const mockSubmit = jest.fn();
const mockOnDelete = jest.fn();

jest.mock(
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

jest.mock(
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

describe("ContextMenuItems", () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

    const initialState = createInitialState({
      events: {
        pendingEvents: {
          eventIds: [],
        },
      },
    });

    render(<ContextMenuItems event={event} close={mockClose} />, {
      state: initialState,
    });

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

    const initialState = createInitialState({
      events: {
        pendingEvents: {
          eventIds: [],
        },
      },
    });

    render(<ContextMenuItems event={event} close={mockClose} />, {
      state: initialState,
    });

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

    const initialState = createInitialState({
      events: {
        pendingEvents: {
          eventIds: [event._id!],
        },
      },
    });

    render(<ContextMenuItems event={event} close={mockClose} />, {
      state: initialState,
    });

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

    const initialState = createInitialState({
      events: {
        pendingEvents: {
          eventIds: [event._id!],
        },
      },
    });

    render(<ContextMenuItems event={event} close={mockClose} />, {
      state: initialState,
    });

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

    const initialState = createInitialState({
      events: {
        pendingEvents: {
          eventIds: [event._id!],
        },
      },
    });

    render(<ContextMenuItems event={event} close={mockClose} />, {
      state: initialState,
    });

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

    const initialState = createInitialState({
      events: {
        pendingEvents: {
          eventIds: [event._id!],
        },
      },
    });

    render(<ContextMenuItems event={event} close={mockClose} />, {
      state: initialState,
    });

    const deleteButton = screen.getByText("Delete").closest("li");
    expect(deleteButton).toHaveStyle({ cursor: "wait" });
  });

  it("should allow actions for non-pending event when other events are pending", async () => {
    const user = userEvent.setup();
    const event = createMockGridEvent({
      _id: "normal-event-1",
      title: "Normal Event",
    });

    const initialState = createInitialState({
      events: {
        pendingEvents: {
          eventIds: ["other-pending-event"],
        },
      },
    });

    render(<ContextMenuItems event={event} close={mockClose} />, {
      state: initialState,
    });

    const deleteButton = screen.getByText("Delete");
    await user.click(deleteButton);

    // Delete should be called for non-pending events even if others are pending
    expect(mockOnDelete).toHaveBeenCalled();
    expect(mockClose).toHaveBeenCalled();
  });
});
