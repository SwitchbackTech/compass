import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { createMockStandaloneEvent } from "@core/util/test/ccal.event.factory";
import { AllDayAgendaEvent } from "./AllDayAgendaEvent";

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

describe("AllDayAgendaEvent", () => {
  it("renders the event title", () => {
    const event = createMockStandaloneEvent(
      {
        title: "All Day Test Event",
        _id: "abc123",
      },
      true, // allDayEvent = true
    );
    render(<AllDayAgendaEvent event={event} />);
    expect(screen.getByText("All Day Test Event")).toBeInTheDocument();
  });

  it("does not render if event has no title", () => {
    const event = createMockStandaloneEvent(
      {
        title: undefined,
      },
      true,
    );
    const { container } = render(<AllDayAgendaEvent event={event} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("has the correct aria-label and data-event-id", () => {
    const event = createMockStandaloneEvent(
      {
        title: "All Day Test Event",
        _id: "abc123",
      },
      true,
    );
    render(<AllDayAgendaEvent event={event} />);
    const eventButton = screen.getByRole("button");
    expect(eventButton).toHaveAttribute("aria-label", "All Day Test Event");
    expect(eventButton).toHaveAttribute("data-event-id", "abc123");
  });

  it("applies opacity-60 class for past events", () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const yesterdayEnd = new Date(Date.now() - 12 * 60 * 60 * 1000);
    const event = createMockStandaloneEvent(
      {
        title: "Past Event",
        _id: "abc123",
        startDate: yesterday.toISOString(),
      },
      true,
    );
    // Manually set endDate since createMockStandaloneEvent doesn't allow it in overrides
    event.endDate = yesterdayEnd.toISOString();
    render(<AllDayAgendaEvent event={event} />);
    const eventButton = screen.getByRole("button");
    expect(eventButton.className).toMatch(/opacity-60/);
  });

  it("does NOT apply opacity-60 for future events", () => {
    const event = createMockStandaloneEvent(
      {
        title: "Future Event",
        _id: "abc123",
      },
      true,
    );
    render(<AllDayAgendaEvent event={event} />);
    const eventButton = screen.getByRole("button");
    expect(eventButton.className).not.toMatch(/opacity-60/);
  });
});
