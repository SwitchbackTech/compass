import { ObjectId } from "bson";
import "@testing-library/jest-dom";
import { fireEvent, screen } from "@testing-library/react";
import { ID_OPTIMISTIC_PREFIX } from "@core/constants/core.constants";
import { createMockStandaloneEvent } from "@core/util/test/ccal.event.factory";
import { render } from "@web/__tests__/__mocks__/mock.render";
import { useEventResizeActions } from "@web/common/hooks/useEventResizeActions";
import {
  CursorItem,
  useFloatingNodeIdAtCursor,
} from "@web/common/hooks/useOpenAtCursor";
import { Schema_GridEvent } from "@web/common/types/web.event.types";
import { gridEventDefaultPosition } from "@web/common/utils/event/event.util";
import { DraggableTimedAgendaEvent } from "@web/views/Day/components/Agenda/Events/TimedAgendaEvent/DraggableTimedAgendaEvent";
import { useOpenAgendaEventPreview } from "@web/views/Day/hooks/events/useOpenAgendaEventPreview";
import { useOpenEventContextMenu } from "@web/views/Day/hooks/events/useOpenEventContextMenu";
import {
  getAgendaEventPosition,
  getEventHeight,
} from "@web/views/Day/util/agenda/agenda.util";

// Mock the hooks
jest.mock("@web/views/Day/hooks/events/useOpenAgendaEventPreview");
jest.mock("@web/views/Day/hooks/events/useOpenEventContextMenu");
jest.mock("@web/common/hooks/useOpenAtCursor");
jest.mock("@web/common/hooks/useEventResizeActions");
jest.mock("@web/views/Day/util/agenda/agenda.util");

describe("DraggableTimedAgendaEvent", () => {
  const standaloneEvent = createMockStandaloneEvent();

  const baseEvent: Schema_GridEvent = {
    ...standaloneEvent,
    startDate: new Date("2023-01-01T10:00:00Z"),
    endDate: new Date("2023-01-01T11:00:00Z"),
    origin: standaloneEvent.origin!,
    priority: standaloneEvent.priority!,
    user: standaloneEvent.user!,
    position: gridEventDefaultPosition,
  };

  const defaultProps = {
    bounds: document.createElement("div"),
    interactions: {
      getReferenceProps: jest.fn((props) => props),
      getFloatingProps: jest.fn(),
      getItemProps: jest.fn(),
    } as any,
    isDraftEvent: false,
    isNewDraftEvent: false,
  };

  const mockOpenAgendaEventPreview = jest.fn();
  const mockOpenEventContextMenu = jest.fn();
  const mockOnResize = jest.fn();
  const mockOnResizeStart = jest.fn();
  const mockOnResizeStop = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useOpenAgendaEventPreview as jest.Mock).mockReturnValue(
      mockOpenAgendaEventPreview,
    );
    (useOpenEventContextMenu as jest.Mock).mockReturnValue(
      mockOpenEventContextMenu,
    );
    (useFloatingNodeIdAtCursor as jest.Mock).mockReturnValue(null);
    (useEventResizeActions as jest.Mock).mockReturnValue({
      onResize: mockOnResize,
      onResizeStart: mockOnResizeStart,
      onResizeStop: mockOnResizeStop,
    });
    (getAgendaEventPosition as jest.Mock).mockReturnValue(100);
    (getEventHeight as jest.Mock).mockReturnValue(50);
  });

  it("should render correctly", () => {
    render(<DraggableTimedAgendaEvent event={baseEvent} {...defaultProps} />);

    const eventElement = screen.getByRole("button");
    expect(eventElement).toBeInTheDocument();
    expect(eventElement).toHaveStyle({ top: "100px", height: "50px" });
    expect(eventElement).toHaveAttribute("aria-label", baseEvent.title);
  });

  it("should not render when startDate is missing", () => {
    const event: Partial<Schema_GridEvent> = {
      ...baseEvent,
      startDate: undefined,
    };

    render(
      <DraggableTimedAgendaEvent
        event={event as Schema_GridEvent}
        {...defaultProps}
      />,
    );
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("should call openAgendaEventPreview on focus", () => {
    render(<DraggableTimedAgendaEvent event={baseEvent} {...defaultProps} />);

    const eventElement = screen.getByRole("button");
    fireEvent.focus(eventElement);

    expect(mockOpenAgendaEventPreview).toHaveBeenCalled();
  });

  it("should call openAgendaEventPreview on pointer enter", () => {
    render(<DraggableTimedAgendaEvent event={baseEvent} {...defaultProps} />);

    const eventElement = screen.getByRole("button");
    fireEvent.pointerEnter(eventElement);

    expect(mockOpenAgendaEventPreview).toHaveBeenCalled();
  });

  it("should call openEventContextMenu on context menu", () => {
    render(<DraggableTimedAgendaEvent event={baseEvent} {...defaultProps} />);

    const eventElement = screen.getByRole("button");
    fireEvent.contextMenu(eventElement);

    expect(mockOpenEventContextMenu).toHaveBeenCalled();
  });

  it("should not call interactions when event form is open", () => {
    (useFloatingNodeIdAtCursor as jest.Mock).mockReturnValue(
      CursorItem.EventForm,
    );

    render(<DraggableTimedAgendaEvent event={baseEvent} {...defaultProps} />);

    const eventElement = screen.getByRole("button");

    fireEvent.focus(eventElement);
    expect(mockOpenAgendaEventPreview).not.toHaveBeenCalled();

    fireEvent.pointerEnter(eventElement);
    expect(mockOpenAgendaEventPreview).not.toHaveBeenCalled();

    fireEvent.contextMenu(eventElement);
    expect(mockOpenEventContextMenu).not.toHaveBeenCalled();
  });

  it("should render correctly with optimistic event", () => {
    const optimisticId = `${ID_OPTIMISTIC_PREFIX}-${new ObjectId().toString()}`;
    const optimisticEvent: Schema_GridEvent = {
      ...baseEvent,
      _id: optimisticId,
    };

    render(
      <DraggableTimedAgendaEvent event={optimisticEvent} {...defaultProps} />,
    );

    const eventElement = screen.getByRole("button");
    expect(eventElement).toBeInTheDocument();
    expect(eventElement).toHaveAttribute("data-event-id", optimisticId);
  });
});
