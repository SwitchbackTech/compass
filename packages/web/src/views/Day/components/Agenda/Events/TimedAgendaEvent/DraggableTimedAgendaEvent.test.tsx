import "@testing-library/jest-dom";
import { screen } from "@testing-library/react";
import { createMockStandaloneEvent } from "@core/util/test/ccal.event.factory";
import { render } from "@web/__tests__/__mocks__/mock.render";
import { Schema_GridEvent } from "@web/common/types/web.event.types";
import { gridEventDefaultPosition } from "@web/common/utils/event/event.util";
import { DraggableTimedAgendaEvent } from "@web/views/Day/components/Agenda/Events/TimedAgendaEvent/DraggableTimedAgendaEvent";

jest.mock("@web/views/Calendar/components/Draft/context/useDraft");

describe("AgendaEvent", () => {
  const standaloneEvent = createMockStandaloneEvent();

  const baseEvent: Schema_GridEvent = {
    ...standaloneEvent,
    startDate: standaloneEvent.startDate!,
    endDate: standaloneEvent.endDate!,
    origin: standaloneEvent.origin!,
    priority: standaloneEvent.priority!,
    user: standaloneEvent.user!,
    position: gridEventDefaultPosition,
  };

  const defaultProps = {
    bounds: document.createElement("div"),
    interactions: {
      getReferenceProps: jest.fn(),
      getFloatingProps: jest.fn(),
      getItemProps: jest.fn(),
    } as any,
    isDraftEvent: false,
    isNewDraftEvent: false,
  };

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

  it("should not render when endDate is missing", () => {
    const event: Partial<Schema_GridEvent> = {
      ...baseEvent,
      endDate: undefined,
    };

    render(
      <DraggableTimedAgendaEvent
        event={event as Schema_GridEvent}
        {...defaultProps}
      />,
    );
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("has the correct aria-label and data-event-id", () => {
    render(<DraggableTimedAgendaEvent event={baseEvent} {...defaultProps} />);

    const eventButton = screen.getByRole("button");

    expect(eventButton).toHaveAttribute("aria-label", baseEvent.title);
    expect(eventButton).toHaveAttribute("data-event-id", baseEvent._id);
  });
});
