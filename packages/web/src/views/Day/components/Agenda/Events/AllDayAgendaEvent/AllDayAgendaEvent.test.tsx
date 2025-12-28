import dayjs from "dayjs";
import "@testing-library/jest-dom";
import { createMockStandaloneEvent } from "@core/util/test/ccal.event.factory";
import { render, screen } from "@web/__tests__/__mocks__/mock.render";
import { Schema_GridEvent } from "@web/common/types/web.event.types";
import { gridEventDefaultPosition } from "@web/common/utils/event/event.util";
import { AllDayAgendaEvent } from "@web/views/Day/components/Agenda/Events/AllDayAgendaEvent/AllDayAgendaEvent";

describe("AllDayAgendaEvent", () => {
  const standaloneEvent = createMockStandaloneEvent({}, true);

  const event: Schema_GridEvent = {
    ...standaloneEvent,
    title: "All Day Test Event",
    startDate: standaloneEvent.startDate!,
    endDate: standaloneEvent.endDate!,
    origin: standaloneEvent.origin!,
    priority: standaloneEvent.priority!,
    user: standaloneEvent.user!,
    position: gridEventDefaultPosition,
  };

  it("renders the event title", () => {
    render(<AllDayAgendaEvent event={event} />);

    expect(screen.getByText(event.title!)).toBeInTheDocument();
  });

  it("applies opacity-60 class for past events", () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const yesterdayEnd = new Date(Date.now() - 12 * 60 * 60 * 1000);
    const pastEvent = {
      ...event,
      startDate: yesterday.toISOString(),
      endDate: yesterdayEnd.toISOString(),
    };

    render(<AllDayAgendaEvent event={pastEvent} />);

    const eventElement = screen.getByText(pastEvent.title!).closest("div");

    expect(eventElement?.className).toMatch(/opacity-60/);
  });

  it("does NOT apply opacity-60 for future events", () => {
    const startDate = dayjs().add(1, "day").toISOString();

    const futureEvent = {
      ...event,
      ...createMockStandaloneEvent({ startDate }, true),
    };

    render(<AllDayAgendaEvent event={futureEvent} />);

    const eventElement = screen.getByText(futureEvent.title!).closest("div");

    expect(eventElement?.className).not.toMatch(/opacity-60/);
  });
});
