import { render, screen } from "@testing-library/react";
import { Origin, Priorities } from "@core/constants/core.constants";
import { Categories_Event, type Schema_Event } from "@core/types/event.types";
import { describe, expect, it, mock } from "bun:test";

mock.module("@web/views/Forms/EventForm/PrioritySection", () => ({
  PrioritySection: () => null,
}));

mock.module("@web/views/Forms/EventForm/SaveSection", () => ({
  SaveSection: () => null,
}));

mock.module(
  "@web/views/Forms/SomedayEventForm/SomedayRecurrenceSection/SomedayRecurrenceSection",
  () => ({ SomedayRecurrenceSection: () => null }),
);

mock.module("@web/views/Forms/SomedayEventForm/SomedayEventActionMenu", () => ({
  SomedayEventActionMenu: () => (
    <button type="button">Someday event actions</button>
  ),
}));

mock.module(
  "@web/views/Forms/SomedayEventForm/useSomedayFormShortcuts",
  () => ({ useSomedayFormShortcuts: () => undefined }),
);

const { SomedayEventForm } =
  require("./SomedayEventForm") as typeof import("./SomedayEventForm");

const event: Schema_Event = {
  _id: "someday-event-1",
  description: "Plan the launch",
  endDate: "2026-06-19T15:00:00.000Z",
  isAllDay: false,
  isSomeday: true,
  origin: Origin.COMPASS,
  priority: Priorities.UNASSIGNED,
  startDate: "2026-06-19T14:00:00.000Z",
  title: "Someday event",
  user: "user-1",
};

describe("SomedayEventForm", () => {
  it("renders the title before the actions on the same row", () => {
    render(
      <SomedayEventForm
        category={Categories_Event.SOMEDAY_WEEK}
        event={event}
        isDraft={false}
        isExistingEvent={true}
        onClose={mock()}
        onDelete={mock()}
        onDuplicate={mock()}
        onSubmit={mock()}
        setEvent={mock()}
      />,
    );

    const title = screen.getByPlaceholderText("Title");
    const actions = screen.getByRole("button", {
      name: "Someday event actions",
    });
    const row = title.parentElement?.parentElement;

    expect(row).toBe(actions.parentElement?.parentElement);
    expect(row).toHaveClass("flex");
    expect(title.parentElement).toHaveClass("flex-1");
    expect(actions.parentElement).toHaveClass("shrink-0");
    expect(row?.firstElementChild?.contains(title)).toBe(true);
    expect(row?.lastElementChild?.contains(actions)).toBe(true);
  });
});
