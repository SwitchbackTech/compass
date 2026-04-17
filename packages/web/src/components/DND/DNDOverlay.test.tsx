import { render, screen } from "@testing-library/react";
import { type ReactNode } from "react";
import { Categories_Event } from "@core/types/event.types";
import { beforeEach, describe, expect, it, mock } from "bun:test";
import { afterAll } from "bun:test";

const useDndContext = mock();

mock.module("@dnd-kit/core", () => ({
  useDndContext,
  useDraggable: mock(),
  useDroppable: mock(),
  DndContext: mock(),
  DragOverlay: ({ children }: { children: ReactNode }) => (
    <div data-testid="drag-overlay">{children}</div>
  ),
  KeyboardSensor: "KeyboardSensor",
  MouseSensor: "MouseSensor",
  TouchSensor: "TouchSensor",
  useSensor: mock(),
  useSensors: mock(),
}));

mock.module("@dnd-kit/modifiers", () => ({
  restrictToVerticalAxis: mock(),
}));

mock.module(
  "@web/views/Day/components/Agenda/Events/TimedAgendaEvent/TimedAgendaEvent",
  () => ({
    TimedAgendaEvent: () => <div data-testid="agenda-event">Agenda Event</div>,
  }),
);

mock.module(
  "@web/views/Day/components/Agenda/Events/AllDayAgendaEvent/AllDayAgendaEvent",
  () => ({
    AllDayAgendaEvent: () => (
      <div data-testid="all-day-agenda-event">All Day Agenda Event</div>
    ),
  }),
);

const { DNDOverlay } = require("./DNDOverlay") as typeof import("./DNDOverlay");

describe("DNDOverlay", () => {
  beforeEach(() => {
    useDndContext.mockClear();
    useDndContext.mockReturnValue({
      active: null,
      over: null,
    });
  });

  it("renders nothing when no active item", () => {
    render(<DNDOverlay />);
    expect(screen.queryByTestId("drag-overlay")).toBeEmptyDOMElement();
  });

  it("renders AgendaEvent when dragging TIMED event", () => {
    useDndContext.mockReturnValue({
      active: {
        id: "test-id",
        data: {
          current: {
            type: Categories_Event.TIMED,
            view: "day",
            event: { _id: "event-1" },
          },
        },
      },
      over: null,
    });

    render(<DNDOverlay />);
    expect(screen.getByTestId("agenda-event")).toBeInTheDocument();
  });

  it("renders AllDayAgendaEvent when dragging ALLDAY event", () => {
    useDndContext.mockReturnValue({
      active: {
        id: "test-id",
        data: {
          current: {
            type: Categories_Event.ALLDAY,
            view: "day",
            event: { _id: "event-1" },
          },
        },
      },
      over: null,
    });

    render(<DNDOverlay />);
    expect(screen.getByTestId("all-day-agenda-event")).toBeInTheDocument();
  });

  it("renders children for unknown types", () => {
    useDndContext.mockReturnValue({
      active: {
        id: "test-id",
        data: {
          current: {
            type: "UNKNOWN",
            view: "day",
            event: { _id: "event-1" },
          },
        },
      },
      over: null,
    });

    render(
      <DNDOverlay>
        <div data-testid="child-content">Child Content</div>
      </DNDOverlay>,
    );
    expect(screen.getByTestId("child-content")).toBeInTheDocument();
  });
});

afterAll(() => {
  mock.restore();
});
