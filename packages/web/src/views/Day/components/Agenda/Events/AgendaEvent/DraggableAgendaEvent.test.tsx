import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { createMockStandaloneEvent } from "@core/util/test/ccal.event.factory";
import { Schema_GridEvent } from "@web/common/types/web.event.types";
import { gridEventDefaultPosition } from "@web/common/utils/event/event.util";
import { useDraftContextV2 } from "@web/views/Calendar/components/Draft/context/useDraftContextV2";
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

jest.mock("@web/views/Calendar/components/Draft/context/useDraftContextV2");

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

  beforeEach(() => {
    (useDraftContextV2 as jest.Mock).mockReturnValue({
      maxAgendaZIndex: 10,
    });
  });

  it("should not render when startDate is missing", () => {
    const event: Partial<Schema_GridEvent> = {
      ...baseEvent,
      startDate: undefined,
    };

    const { container } = renderWithMenuProvider(
      <DraggableAgendaEvent event={event as Schema_GridEvent} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("should not render when endDate is missing", () => {
    const event: Partial<Schema_GridEvent> = {
      ...baseEvent,
      endDate: undefined,
    };

    const { container } = renderWithMenuProvider(
      <DraggableAgendaEvent event={event as Schema_GridEvent} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("has the correct aria-label and data-event-id", () => {
    renderWithMenuProvider(<DraggableAgendaEvent event={baseEvent} />);

    const eventButton = screen.getByRole("button");

    expect(eventButton).toHaveAttribute("aria-label", baseEvent.title);
    expect(eventButton).toHaveAttribute("data-event-id", baseEvent._id);
  });
});
