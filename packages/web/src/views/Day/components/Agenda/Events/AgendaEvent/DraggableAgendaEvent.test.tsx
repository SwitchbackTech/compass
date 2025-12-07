import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { createMockStandaloneEvent } from "@core/util/test/ccal.event.factory";
import { Schema_GridEvent } from "@web/common/types/web.event.types";
import { gridEventDefaultPosition } from "@web/common/utils/event/event.util";
import { DraggableAgendaEvent } from "@web/views/Day/components/Agenda/Events/AgendaEvent/DraggableAgendaEvent";
import { EventContextMenuProvider } from "@web/views/Day/components/ContextMenu/EventContextMenuContext";

// Mock the AgendaEventMenu components to simplify testing
jest.mock("../AgendaEventMenu/AgendaEventMenu", () => ({
  AgendaEventMenu: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

jest.mock("../AgendaEventMenu/AgendaEventMenuContent", () => ({
  AgendaEventMenuContent: () => null,
}));

jest.mock("../AgendaEventMenu/AgendaEventMenuTrigger", () => ({
  AgendaEventMenuTrigger: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

function renderWithMenuProvider(ui: React.ReactElement) {
  return render(<EventContextMenuProvider>{ui}</EventContextMenuProvider>);
}

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

  it("should not render when startDate is missing", () => {
    const event: Partial<Schema_GridEvent> = {
      ...baseEvent,
      startDate: undefined,
    };

    const { container } = renderWithMenuProvider(
      <DraggableAgendaEvent
        event={event as Schema_GridEvent}
        containerWidth={236}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("should not render when endDate is missing", () => {
    const event: Partial<Schema_GridEvent> = {
      ...baseEvent,
      endDate: undefined,
    };

    const { container } = renderWithMenuProvider(
      <DraggableAgendaEvent
        event={event as Schema_GridEvent}
        containerWidth={236}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("should render with overlapping styles when 2 events overlap", () => {
    const event: Schema_GridEvent = {
      ...baseEvent,
      position: {
        ...gridEventDefaultPosition,
        totalEventsInGroup: 2,
        isOverlapping: true,
        widthMultiplier: 0.5, // 1/2 = 2 overlapping events
        horizontalOrder: 1,
      },
    };

    renderWithMenuProvider(
      <DraggableAgendaEvent event={event} containerWidth={236} />,
    );

    const eventElement = screen.getByRole("button");
    // When overlapping, should have a border
    expect(eventElement).toHaveClass("border");
    expect(eventElement).toHaveClass("border-border-transparent");
    // Should have overlapping styles applied
    expect(eventElement).toHaveStyle({
      left: "2px",
      width: "112px",
      zIndex: "1",
    });
  });

  it("has the correct aria-label and data-event-id", () => {
    renderWithMenuProvider(
      <DraggableAgendaEvent event={baseEvent} containerWidth={236} />,
    );

    const eventButton = screen.getByRole("button");

    expect(eventButton).toHaveAttribute("aria-label", baseEvent.title);
    expect(eventButton).toHaveAttribute("data-event-id", baseEvent._id);
  });

  it("should render with correct z-index for second overlapping event", () => {
    const event: Schema_GridEvent = {
      ...baseEvent,
      position: {
        ...gridEventDefaultPosition,
        totalEventsInGroup: 2,
        isOverlapping: true,
        widthMultiplier: 0.5, // 1/2 = 2 overlapping events
        horizontalOrder: 2,
      },
    };

    renderWithMenuProvider(
      <DraggableAgendaEvent event={event} containerWidth={236} />,
    );

    const eventElement = screen.getByRole("button");
    expect(eventElement).toHaveStyle({
      zIndex: "2",
      left: "116px",
      width: "112px",
    });
  });

  it("should render with correct z-index for third overlapping event", () => {
    const event: Schema_GridEvent = {
      ...baseEvent,
      position: {
        ...gridEventDefaultPosition,
        totalEventsInGroup: 3,
        isOverlapping: true,
        widthMultiplier: 0.33, // 1/3 = 3 overlapping events
        horizontalOrder: 3,
      },
    };

    renderWithMenuProvider(
      <DraggableAgendaEvent event={event} containerWidth={236} />,
    );

    const eventElement = screen.getByRole("button");
    expect(eventElement).toHaveStyle({
      zIndex: "3",
      left: "116px",
      width: "112px",
    });
  });
});
