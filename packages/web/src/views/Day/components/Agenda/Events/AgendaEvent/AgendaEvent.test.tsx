import { ObjectId } from "bson";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { Origin, Priorities } from "@core/constants/core.constants";
import { Schema_Event } from "@core/types/event.types";
import { colorByPriority } from "@web/common/styles/theme.util";
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
  const baseEvent: Schema_Event = {
    _id: new ObjectId().toString(),
    title: "Test Event",
    description: "Test description",
    startDate: "2024-01-15T09:00:00Z",
    endDate: "2024-01-15T10:00:00Z",
    isAllDay: false,
    origin: Origin.COMPASS,
  };

  it("should render event with UNASSIGNED priority color", () => {
    const event: Schema_Event = {
      ...baseEvent,
      priority: Priorities.UNASSIGNED,
    };

    renderWithMenuProvider(<AgendaEvent event={event} />);

    const eventElement = screen.getByRole("button");
    expect(eventElement).toHaveStyle({
      backgroundColor: colorByPriority[Priorities.UNASSIGNED],
    });
  });

  it("should render event with WORK priority color", () => {
    const event: Schema_Event = {
      ...baseEvent,
      priority: Priorities.WORK,
    };

    renderWithMenuProvider(<AgendaEvent event={event} />);

    const eventElement = screen.getByRole("button");
    expect(eventElement).toHaveStyle({
      backgroundColor: colorByPriority[Priorities.WORK],
    });
  });

  it("should render event with RELATIONS priority color", () => {
    const event: Schema_Event = {
      ...baseEvent,
      priority: Priorities.RELATIONS,
    };

    renderWithMenuProvider(<AgendaEvent event={event} />);

    const eventElement = screen.getByRole("button");
    expect(eventElement).toHaveStyle({
      backgroundColor: colorByPriority[Priorities.RELATIONS],
    });
  });

  it("should render event with SELF priority color", () => {
    const event: Schema_Event = {
      ...baseEvent,
      priority: Priorities.SELF,
    };

    renderWithMenuProvider(<AgendaEvent event={event} />);

    const eventElement = screen.getByRole("button");
    expect(eventElement).toHaveStyle({
      backgroundColor: colorByPriority[Priorities.SELF],
    });
  });

  it("should default to UNASSIGNED priority color when priority is missing", () => {
    const event: Partial<Schema_Event> = {
      ...baseEvent,
      priority: undefined,
    };

    renderWithMenuProvider(<AgendaEvent event={event as Schema_Event} />);

    const eventElement = screen.getByRole("button");
    expect(eventElement).toHaveStyle({
      backgroundColor: colorByPriority[Priorities.UNASSIGNED],
    });
  });

  it("should not render when startDate is missing", () => {
    const event: Partial<Schema_Event> = {
      ...baseEvent,
      startDate: undefined,
    };

    const { container } = renderWithMenuProvider(
      <AgendaEvent event={event as Schema_Event} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("should not render when endDate is missing", () => {
    const event: Partial<Schema_Event> = {
      ...baseEvent,
      endDate: undefined,
    };

    const { container } = renderWithMenuProvider(
      <AgendaEvent event={event as Schema_Event} />,
    );
    expect(container.firstChild).toBeNull();
  });
});
