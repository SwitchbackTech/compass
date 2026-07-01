import { HotkeyManager } from "@tanstack/react-hotkeys";
import { render, screen, waitFor } from "@testing-library/react";
import { Origin, Priorities } from "@core/constants/core.constants";
import { Categories_Event, type Schema_Event } from "@core/types/event.types";
import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";

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
  SomedayEventActionMenu: ({
    onDeleteClick,
  }: {
    onDeleteClick: () => void;
  }) => (
    <>
      <button type="button">Someday event actions</button>
      <button type="button" onClick={onDeleteClick}>
        Delete someday event
      </button>
    </>
  ),
}));

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

function dispatchDelete(target: HTMLElement) {
  const event = new KeyboardEvent("keydown", {
    bubbles: true,
    cancelable: true,
    composed: true,
    key: "Delete",
  });
  target.dispatchEvent(event);
  return event;
}

describe("SomedayEventForm", () => {
  beforeEach(() => {
    HotkeyManager.resetInstance();
    document.body.removeAttribute("data-app-locked");
  });

  afterEach(() => {
    HotkeyManager.resetInstance();
  });

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

  it("closes a someday draft immediately when deleting from the menu", () => {
    const onClose = mock();
    const onDelete = mock();

    render(
      <SomedayEventForm
        category={Categories_Event.SOMEDAY_WEEK}
        event={{ ...event, _id: undefined, title: "Someday draft" }}
        isDraft={true}
        isExistingEvent={false}
        onClose={onClose}
        onDelete={onDelete}
        onDuplicate={mock()}
        onSubmit={mock()}
        setEvent={mock()}
      />,
    );

    screen.getByRole("button", { name: "Delete someday event" }).click();

    expect(onDelete).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not delete an existing someday event when Delete is pressed in the title field", () => {
    const onClose = mock();
    const onDelete = mock();

    render(
      <SomedayEventForm
        category={Categories_Event.SOMEDAY_WEEK}
        event={event}
        isDraft={false}
        isExistingEvent={true}
        onClose={onClose}
        onDelete={onDelete}
        onDuplicate={mock()}
        onSubmit={mock()}
        setEvent={mock()}
      />,
    );

    const titleField = screen.getByPlaceholderText("Title");
    titleField.focus();

    const eventResult = dispatchDelete(titleField);

    expect(eventResult.defaultPrevented).toBe(false);
    expect(onDelete).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("does not delete an existing someday event when Delete is pressed in the description field", () => {
    const onClose = mock();
    const onDelete = mock();

    render(
      <SomedayEventForm
        category={Categories_Event.SOMEDAY_WEEK}
        event={event}
        isDraft={false}
        isExistingEvent={true}
        onClose={onClose}
        onDelete={onDelete}
        onDuplicate={mock()}
        onSubmit={mock()}
        setEvent={mock()}
      />,
    );

    const descriptionField = screen.getByPlaceholderText("Description");
    descriptionField.focus();

    const eventResult = dispatchDelete(descriptionField);

    expect(eventResult.defaultPrevented).toBe(false);
    expect(onDelete).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("still deletes an existing someday event when Delete is pressed on a non-text form target", async () => {
    const onClose = mock();
    const onDelete = mock();

    render(
      <SomedayEventForm
        category={Categories_Event.SOMEDAY_WEEK}
        event={event}
        isDraft={false}
        isExistingEvent={true}
        onClose={onClose}
        onDelete={onDelete}
        onDuplicate={mock()}
        onSubmit={mock()}
        setEvent={mock()}
      />,
    );

    const form = screen.getByRole("form");
    form.focus();

    const eventResult = dispatchDelete(form);

    expect(eventResult.defaultPrevented).toBe(true);

    await waitFor(() => {
      expect(onDelete).toHaveBeenCalledTimes(1);
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
