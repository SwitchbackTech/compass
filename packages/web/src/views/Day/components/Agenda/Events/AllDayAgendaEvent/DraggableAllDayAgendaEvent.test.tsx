import { ObjectId } from "bson";
import { UseInteractionsReturn } from "@floating-ui/react";
import "@testing-library/jest-dom";
import { createMockStandaloneEvent } from "@core/util/test/ccal.event.factory";
import { render, screen } from "@web/__tests__/__mocks__/mock.render";
import { Schema_GridEvent } from "@web/common/types/web.event.types";
import { gridEventDefaultPosition } from "@web/common/utils/event/event.util";
import { DraggableAllDayAgendaEvent } from "@web/views/Day/components/Agenda/Events/AllDayAgendaEvent/DraggableAllDayAgendaEvent";

describe("DraggableAllDayAgendaEvent", () => {
  const standaloneEvent = createMockStandaloneEvent({}, true);

  const event: Schema_GridEvent = {
    ...standaloneEvent,
    startDate: standaloneEvent.startDate!,
    endDate: standaloneEvent.endDate!,
    origin: standaloneEvent.origin!,
    priority: standaloneEvent.priority!,
    user: standaloneEvent.user!,
    position: gridEventDefaultPosition,
  };

  const mockInteractions = {
    getReferenceProps: jest.fn(() => ({})),
    getFloatingProps: jest.fn(() => ({})),
    getItemProps: jest.fn(() => ({})),
  } as unknown as UseInteractionsReturn;

  it("renders the event title", () => {
    render(
      <DraggableAllDayAgendaEvent
        event={event}
        interactions={mockInteractions}
        isDraftEvent={false}
        isNewDraftEvent={false}
        isDisabled={false}
      />,
    );

    expect(screen.getByText(event.title!)).toBeInTheDocument();
  });

  it("has the correct aria-label and data-event-id", () => {
    render(
      <DraggableAllDayAgendaEvent
        event={event}
        interactions={mockInteractions}
        isDraftEvent={false}
        isNewDraftEvent={false}
        isDisabled={false}
      />,
    );

    const eventButton = screen.getByRole("button");

    expect(eventButton).toHaveAttribute("aria-label", event.title);
    expect(eventButton).toHaveAttribute("data-event-id", event._id);
  });

  it("should disable dragging when event is pending", () => {
    const eventId = new ObjectId().toString();
    const pendingEvent: Schema_GridEvent = {
      ...event,
      _id: eventId,
    };

    render(
      <DraggableAllDayAgendaEvent
        event={pendingEvent}
        interactions={mockInteractions}
        isDraftEvent={false}
        isNewDraftEvent={false}
        isDisabled={true}
      />,
    );

    const eventButton = screen.getByRole("button");
    expect(eventButton).toBeInTheDocument();
    expect(eventButton).toHaveClass("cursor-wait");
  });

  it("should not disable dragging when event is not pending", () => {
    const eventId = new ObjectId().toString();
    const nonPendingEvent: Schema_GridEvent = {
      ...event,
      _id: eventId,
    };

    render(
      <DraggableAllDayAgendaEvent
        event={nonPendingEvent}
        interactions={mockInteractions}
        isDraftEvent={false}
        isNewDraftEvent={false}
        isDisabled={false}
      />,
    );

    const eventButton = screen.getByRole("button");
    expect(eventButton).toBeInTheDocument();
    expect(eventButton).toHaveClass("cursor-pointer");
    expect(eventButton).not.toHaveClass("cursor-wait");
  });
});
