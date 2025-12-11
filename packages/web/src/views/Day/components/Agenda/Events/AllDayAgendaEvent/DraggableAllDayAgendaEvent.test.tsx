import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { createMockStandaloneEvent } from "@core/util/test/ccal.event.factory";
import { Schema_GridEvent } from "@web/common/types/web.event.types";
import { gridEventDefaultPosition } from "@web/common/utils/event/event.util";
import { DraggableAllDayAgendaEvent } from "@web/views/Day/components/Agenda/Events/AllDayAgendaEvent/DraggableAllDayAgendaEvent";
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

  it("renders the event title", () => {
    renderWithMenuProvider(<DraggableAllDayAgendaEvent event={event} />);

    expect(screen.getByText(event.title!)).toBeInTheDocument();
  });

  it("has the correct aria-label and data-event-id", () => {
    renderWithMenuProvider(<DraggableAllDayAgendaEvent event={event} />);

    const eventButton = screen.getByRole("button");

    expect(eventButton).toHaveAttribute("aria-label", event.title);
    expect(eventButton).toHaveAttribute("data-event-id", event._id);
  });
});
