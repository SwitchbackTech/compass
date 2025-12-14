import "@testing-library/jest-dom";
import { screen } from "@testing-library/react";
import { Priorities } from "@core/constants/core.constants";
import { createMockStandaloneEvent } from "@core/util/test/ccal.event.factory";
import { render } from "@web/__tests__/__mocks__/mock.render";
import { colorByPriority } from "@web/common/styles/theme.util";
import { Schema_GridEvent } from "@web/common/types/web.event.types";
import { gridEventDefaultPosition } from "@web/common/utils/event/event.util";
import { TimedAgendaEvent } from "@web/views/Day/components/Agenda/Events/TimedAgendaEvent/TimedAgendaEvent";

describe("TimedAgendaEvent", () => {
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

  it("should render event with UNASSIGNED priority color", () => {
    const event: Schema_GridEvent = {
      ...baseEvent,
      priority: Priorities.UNASSIGNED,
    };

    render(<TimedAgendaEvent event={event} />);

    const eventElement = screen.getByTestId("agenda-event");
    expect(eventElement).toHaveStyle({
      backgroundColor: colorByPriority[Priorities.UNASSIGNED],
    });
  });

  it("should render event with WORK priority color", () => {
    const event: Schema_GridEvent = {
      ...baseEvent,
      priority: Priorities.WORK,
    };

    render(<TimedAgendaEvent event={event} />);

    const eventElement = screen.getByTestId("agenda-event");
    expect(eventElement).toHaveStyle({
      backgroundColor: colorByPriority[Priorities.WORK],
    });
  });

  it("should render event with RELATIONS priority color", () => {
    const event: Schema_GridEvent = {
      ...baseEvent,
      priority: Priorities.RELATIONS,
    };

    render(<TimedAgendaEvent event={event} />);

    const eventElement = screen.getByTestId("agenda-event");

    expect(eventElement).toHaveStyle({
      backgroundColor: colorByPriority[Priorities.RELATIONS],
    });
  });

  it("should render event with SELF priority color", () => {
    const event: Schema_GridEvent = {
      ...baseEvent,
      priority: Priorities.SELF,
    };

    render(<TimedAgendaEvent event={event} />);

    const eventElement = screen.getByTestId("agenda-event");

    expect(eventElement).toHaveStyle({
      backgroundColor: colorByPriority[Priorities.SELF],
    });
  });

  it("should default to UNASSIGNED priority color when priority is missing", () => {
    const event: Partial<Schema_GridEvent> = {
      ...baseEvent,
      priority: undefined,
    };

    render(<TimedAgendaEvent event={event as Schema_GridEvent} />);

    const eventElement = screen.getByTestId("agenda-event");

    expect(eventElement).toHaveStyle({
      backgroundColor: colorByPriority[Priorities.UNASSIGNED],
    });
  });
});
