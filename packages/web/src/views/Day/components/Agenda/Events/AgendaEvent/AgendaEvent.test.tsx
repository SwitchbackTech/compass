import { ObjectId } from "bson";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { Origin, Priorities } from "@core/constants/core.constants";
import { colorByPriority } from "@web/common/styles/theme.util";
import { Schema_GridEvent } from "@web/common/types/web.event.types";
import { gridEventDefaultPosition } from "@web/common/utils/event/event.util";
import { EventContextMenuProvider } from "../../../ContextMenu/EventContextMenuContext";
import { AgendaEvent } from "./AgendaEvent";

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
  const canvasContext = {
    font: "",
    measureText: jest.fn().mockReturnValue({ width: 0 }),
  } as unknown as CanvasRenderingContext2D;

  const baseEvent: Schema_GridEvent = {
    _id: new ObjectId().toString(),
    title: "Test Event",
    description: "Test description",
    startDate: "2024-01-15T09:00:00Z",
    endDate: "2024-01-15T10:00:00Z",
    isAllDay: false,
    origin: Origin.COMPASS,
    user: "test-user",
    priority: Priorities.UNASSIGNED,
    recurrence: undefined,
    position: gridEventDefaultPosition,
  };

  it("should render event with UNASSIGNED priority color", () => {
    const event: Schema_GridEvent = {
      ...baseEvent,
      priority: Priorities.UNASSIGNED,
    };

    renderWithMenuProvider(
      <AgendaEvent
        event={event}
        containerWidth={236}
        canvasContext={canvasContext}
      />,
    );

    const eventElement = screen.getByRole("button");
    expect(eventElement).toHaveStyle({
      backgroundColor: colorByPriority[Priorities.UNASSIGNED],
    });
  });

  it("should render event with WORK priority color", () => {
    const event: Schema_GridEvent = {
      ...baseEvent,
      priority: Priorities.WORK,
    };

    renderWithMenuProvider(
      <AgendaEvent
        event={event}
        containerWidth={236}
        canvasContext={canvasContext}
      />,
    );

    const eventElement = screen.getByRole("button");
    expect(eventElement).toHaveStyle({
      backgroundColor: colorByPriority[Priorities.WORK],
    });
  });

  it("should render event with RELATIONS priority color", () => {
    const event: Schema_GridEvent = {
      ...baseEvent,
      priority: Priorities.RELATIONS,
    };

    renderWithMenuProvider(
      <AgendaEvent
        event={event}
        containerWidth={236}
        canvasContext={canvasContext}
      />,
    );

    const eventElement = screen.getByRole("button");
    expect(eventElement).toHaveStyle({
      backgroundColor: colorByPriority[Priorities.RELATIONS],
    });
  });

  it("should render event with SELF priority color", () => {
    const event: Schema_GridEvent = {
      ...baseEvent,
      priority: Priorities.SELF,
    };

    renderWithMenuProvider(
      <AgendaEvent
        event={event}
        containerWidth={236}
        canvasContext={canvasContext}
      />,
    );

    const eventElement = screen.getByRole("button");
    expect(eventElement).toHaveStyle({
      backgroundColor: colorByPriority[Priorities.SELF],
    });
  });

  it("should default to UNASSIGNED priority color when priority is missing", () => {
    const event: Partial<Schema_GridEvent> = {
      ...baseEvent,
      priority: undefined,
    };

    renderWithMenuProvider(
      <AgendaEvent
        event={event as Schema_GridEvent}
        containerWidth={236}
        canvasContext={canvasContext}
      />,
    );

    const eventElement = screen.getByRole("button");
    expect(eventElement).toHaveStyle({
      backgroundColor: colorByPriority[Priorities.UNASSIGNED],
    });
  });

  it("should not render when startDate is missing", () => {
    const event: Partial<Schema_GridEvent> = {
      ...baseEvent,
      startDate: undefined,
    };

    const { container } = renderWithMenuProvider(
      <AgendaEvent
        event={event as Schema_GridEvent}
        containerWidth={236}
        canvasContext={canvasContext}
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
      <AgendaEvent
        event={event as Schema_GridEvent}
        containerWidth={236}
        canvasContext={canvasContext}
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
      <AgendaEvent
        event={event}
        containerWidth={236}
        canvasContext={canvasContext}
      />,
    );

    const eventElement = screen.getByRole("button");
    // When overlapping, should have a border
    expect(eventElement).toHaveClass("border");
    expect(eventElement).toHaveClass("border-border-transparent");
    // Should have overlapping styles applied
    expect(eventElement).toHaveStyle({
      left: "-2px",
      width: "114px",
      zIndex: "1",
    });
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
      <AgendaEvent
        event={event}
        containerWidth={236}
        canvasContext={canvasContext}
      />,
    );

    const eventElement = screen.getByRole("button");
    expect(eventElement).toHaveStyle({
      zIndex: "2",
      left: "112px",
      width: "114px",
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
      <AgendaEvent
        event={event}
        containerWidth={236}
        canvasContext={canvasContext}
      />,
    );

    const eventElement = screen.getByRole("button");
    expect(eventElement).toHaveStyle({
      zIndex: "3",
      left: "150px",
      width: "76px",
    });
  });
});
