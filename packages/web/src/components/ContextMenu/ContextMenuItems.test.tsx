import { QueryClient } from "@tanstack/react-query";
import userEvent from "@testing-library/user-event";
import { type ReactElement } from "react";
import {
  type Calendar,
  getCalendarCapabilities,
} from "@core/types/calendar.contracts";
import { CalendarIdSchema } from "@core/types/domain-primitives";
import { createMockStandaloneEvent } from "@core/util/test/ccal.event.factory";
import { render, screen } from "@web/__tests__/__mocks__/mock.render";
import { seedPendingEventMutations } from "@web/__tests__/utils/event-query-test-data";
import { createMockEvent } from "@web/__tests__/utils/factories/event.factory";
import { calendarQueryKeys } from "@web/calendars/calendar.query";
import { type Schema_GridEvent } from "@web/common/types/web.event.types";
import { gridEventDefaultPosition } from "@web/common/utils/event/event.util";
import { createObjectIdString } from "@web/common/utils/id/object-id.util";
import { editGridEventDraft } from "@web/events/grid-event-draft.adapter";
import { useDraftStore } from "@web/events/stores/draft.store";
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

// GridContextMenuWrapper.tsx (the real right-click flow, unconverted here)
// already pushes a GridEventDraft into the store's `gridDraft` field before
// ContextMenuItems mounts; seed the same field directly so edit/editPriority
// have a canonical draft to read.
const seedGridDraftForEvent = (event: Schema_GridEvent) => {
  const strictEvent = createMockEvent({
    content: {
      kind: "details",
      title: event.title ?? "",
      description: event.description ?? "",
    },
  });
  const draft = editGridEventDraft(strictEvent);
  useDraftStore.setState({ gridDraft: draft });
};

const { ContextMenuItems } =
  require("./ContextMenuItems") as typeof import("./ContextMenuItems");

const renderWithTheme = (
  ui: ReactElement,
  {
    pendingEventIds = [],
    calendars,
  }: { pendingEventIds?: string[]; calendars?: Calendar[] } = {},
) => {
  const queryClient = new QueryClient();
  seedPendingEventMutations(queryClient, pendingEventIds);
  if (calendars) {
    queryClient.setQueryData(calendarQueryKeys.all, calendars);
  }

  return render(
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
    </DraftContext.Provider>,
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
    useDraftStore.setState({ gridDraft: null });
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
    seedGridDraftForEvent(event);

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
    seedGridDraftForEvent(event);

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
    seedGridDraftForEvent(event);

    renderWithTheme(<ContextMenuItems event={event} close={mockClose} />);

    await user.click(
      screen.getByRole("button", { name: "Set priority to Work" }),
    );

    expect(mockSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        values: expect.objectContaining({ priority: "work" }),
      }),
    );
    expect(mockClose).toHaveBeenCalled();
  });
});

// packet 08 step 8: read-only (unwritable calendar or busy content) events
// can be inspected but never mutated - the menu drops straight to that
// smaller surface (View, Duplicate) instead of disabling the hidden items.
describe("ContextMenuItems read-only gate", () => {
  const makeCalendar = (overrides: Partial<Calendar> = {}): Calendar => ({
    id: CalendarIdSchema.parse(createObjectIdString()),
    name: "Shared calendar",
    description: "",
    timeZone: null,
    foregroundColor: "#000000",
    backgroundColor: "#3b82f6",
    provider: "google",
    access: "reader",
    capabilities: getCalendarCapabilities("reader"),
    isPrimary: false,
    isVisible: true,
    isActive: true,
    ...overrides,
  });

  beforeEach(() => {
    mockClose.mockClear();
    mockOnDelete.mockClear();
    useDraftStore.setState({ gridDraft: null });
  });

  it("shows View (not Edit), hides priority and Delete, but keeps Duplicate for a read-only-calendar event", () => {
    const readOnlyCalendar = makeCalendar();
    const event = createMockGridEvent({
      _id: "read-only-event-1",
      title: "Shared event",
      calendarId: readOnlyCalendar.id,
    });

    renderWithTheme(<ContextMenuItems event={event} close={mockClose} />, {
      calendars: [readOnlyCalendar],
    });

    expect(screen.getByRole("button", { name: "View" })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Edit" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Duplicate" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Delete" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Set priority to/ }),
    ).not.toBeInTheDocument();
  });

  it("treats a busy event as read-only even on a writable calendar", () => {
    const writableCalendar = makeCalendar({
      access: "owner",
      capabilities: getCalendarCapabilities("owner"),
    });
    const event = createMockGridEvent({
      _id: "busy-event-1",
      title: "",
      calendarId: writableCalendar.id,
      isBusy: true,
    });

    renderWithTheme(<ContextMenuItems event={event} close={mockClose} />, {
      calendars: [writableCalendar],
    });

    expect(screen.getByRole("button", { name: "View" })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Delete" }),
    ).not.toBeInTheDocument();
  });

  it("keeps the full menu (Edit, priority, Delete) for a writable-calendar event", () => {
    const writableCalendar = makeCalendar({
      access: "owner",
      capabilities: getCalendarCapabilities("owner"),
    });
    const event = createMockGridEvent({
      _id: "writable-event-1",
      title: "My event",
      calendarId: writableCalendar.id,
    });

    renderWithTheme(<ContextMenuItems event={event} close={mockClose} />, {
      calendars: [writableCalendar],
    });

    expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Set priority to Work" }),
    ).toBeInTheDocument();
  });
});
