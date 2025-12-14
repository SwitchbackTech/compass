import { useDndContext } from "@dnd-kit/core";
import { render, screen } from "@testing-library/react";
import { Categories_Event } from "@core/types/event.types";
import { DNDOverlay } from "./DNDOverlay";

jest.mock("@dnd-kit/core", () => ({
  useDndContext: jest.fn(),
  DragOverlay: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="drag-overlay">{children}</div>
  ),
}));

jest.mock("@dnd-kit/modifiers", () => ({
  restrictToVerticalAxis: jest.fn(),
}));

jest.mock(
  "@web/views/Day/components/Agenda/Events/TimedAgendaEvent/TimedAgendaEvent",
  () => ({
    TimedAgendaEvent: () => <div data-testid="agenda-event">Agenda Event</div>,
  }),
);

jest.mock(
  "@web/views/Day/components/Agenda/Events/AllDayAgendaEvent/AllDayAgendaEvent",
  () => ({
    AllDayAgendaEvent: () => (
      <div data-testid="all-day-agenda-event">All Day Agenda Event</div>
    ),
  }),
);

describe("DNDOverlay", () => {
  beforeEach(() => {
    (useDndContext as jest.Mock).mockReturnValue({
      active: null,
      over: null,
    });
  });

  it("renders nothing when no active item", () => {
    render(<DNDOverlay />);
    expect(screen.queryByTestId("drag-overlay")).toBeEmptyDOMElement();
  });

  it("renders AgendaEvent when dragging TIMED event", () => {
    (useDndContext as jest.Mock).mockReturnValue({
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
    (useDndContext as jest.Mock).mockReturnValue({
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
    (useDndContext as jest.Mock).mockReturnValue({
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
