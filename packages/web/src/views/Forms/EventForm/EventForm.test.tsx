import { HotkeyManager, resolveModifier } from "@tanstack/react-hotkeys";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, type SetStateAction, useState } from "react";
import { Origin, Priorities } from "@core/constants/core.constants";
import { type Schema_Event } from "@core/types/event.types";
import dayjs from "@core/util/date/dayjs";
import { type Props as DateTimeSectionProps } from "@web/views/Forms/EventForm/DateControlsSection/DateTimeSection/DateTimeSection";
import { getFormDates } from "@web/views/Forms/EventForm/DateControlsSection/DateTimeSection/form.datetime.util";
import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";

type CapturedDateTimeSectionProps = Pick<
  DateTimeSectionProps,
  | "displayEndDate"
  | "endTime"
  | "selectedEndDate"
  | "selectedStartDate"
  | "startTime"
>;

interface CapturedDateControlsSectionProps {
  dateTimeSectionProps: CapturedDateTimeSectionProps;
}

let capturedDateControlsSectionProps: CapturedDateControlsSectionProps | null =
  null;

mock.module(
  "@web/views/Forms/EventForm/DateControlsSection/DateControlsSection/DateControlsSection",
  () => ({
    DateControlsSection: (props: CapturedDateControlsSectionProps) => {
      capturedDateControlsSectionProps = props;
      return null;
    },
  }),
);

mock.module("@web/views/Forms/EventForm/EventActionMenu", () => ({
  EventActionMenu: ({ onDelete }: { onDelete: () => void }) => (
    <>
      <button type="button">Event actions</button>
      <button type="button" onClick={onDelete}>
        Delete event
      </button>
    </>
  ),
}));

mock.module("@web/views/Forms/EventForm/PrioritySection", () => ({
  PrioritySection: () => null,
}));

mock.module("@web/views/Forms/EventForm/SaveSection", () => ({
  SaveSection: () => null,
}));

const { EventForm } = require("./EventForm") as typeof import("./EventForm");

function dispatchModD(target: HTMLElement) {
  const modifierKey = resolveModifier("Mod");
  const isControl = modifierKey === "Control";

  target.dispatchEvent(
    new KeyboardEvent("keydown", {
      bubbles: true,
      cancelable: true,
      composed: true,
      ctrlKey: isControl,
      key: "d",
      metaKey: !isControl,
    }),
  );
}

function dispatchArrowDown(target: HTMLElement) {
  const event = new KeyboardEvent("keydown", {
    bubbles: true,
    cancelable: true,
    composed: true,
    key: "ArrowDown",
  });
  target.dispatchEvent(event);
  return event;
}

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

const createEvent = (overrides: Partial<Schema_Event> = {}): Schema_Event => ({
  _id: "event-1",
  description: "",
  endDate: "2026-04-24T15:00:00.000Z",
  isAllDay: false,
  isSomeday: false,
  origin: Origin.COMPASS,
  priority: Priorities.UNASSIGNED,
  startDate: "2026-04-24T14:00:00.000Z",
  title: "Keyboard duplicate event",
  user: "user-1",
  ...overrides,
});

describe("EventForm", () => {
  beforeEach(() => {
    HotkeyManager.resetInstance();
    capturedDateControlsSectionProps = null;
    document.body.removeAttribute("data-app-locked");
  });

  it("renders the title before the actions on the same row", () => {
    render(
      <EventForm
        event={createEvent({ description: "Plan the launch" })}
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
    const actions = screen.getByRole("button", { name: "Event actions" });
    const row = title.parentElement?.parentElement;

    expect(row).toBe(actions.parentElement?.parentElement);
    expect(row).toHaveClass("flex");
    expect(title.parentElement).toHaveClass("flex-1");
    expect(actions.parentElement).toHaveClass("shrink-0");
    expect(row?.firstElementChild?.contains(title)).toBe(true);
    expect(row?.lastElementChild?.contains(actions)).toBe(true);
  });

  it("duplicates the event with Mod+D while the title field is focused", async () => {
    const event = createEvent();
    const onDuplicate = mock();

    render(
      <EventForm
        event={event}
        isDraft={false}
        isExistingEvent={true}
        onClose={mock()}
        onDelete={mock()}
        onDuplicate={onDuplicate}
        onSubmit={mock()}
        setEvent={mock()}
      />,
    );

    const titleField = screen.getByPlaceholderText("Title");
    titleField.focus();

    dispatchModD(titleField);

    await waitFor(() => {
      expect(onDuplicate).toHaveBeenCalledTimes(1);
    });
    expect(onDuplicate).toHaveBeenCalledWith(event);
  });

  it("closes a draft event immediately when deleting from the menu", async () => {
    const user = userEvent.setup();
    const onClose = mock();
    const onDelete = mock();

    render(
      <EventForm
        event={createEvent({ _id: undefined, title: "Unsaved draft" })}
        isDraft={true}
        isExistingEvent={false}
        onClose={onClose}
        onDelete={onDelete}
        onDuplicate={mock()}
        onSubmit={mock()}
        setEvent={mock()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Delete event" }));

    expect(onDelete).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not delete an existing event when Delete is pressed in the title field", async () => {
    const onClose = mock();
    const onDelete = mock();

    render(
      <EventForm
        event={createEvent()}
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

    const event = dispatchDelete(titleField);

    expect(event.defaultPrevented).toBe(false);
    expect(onDelete).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("does not delete an existing event when Delete is pressed in the description field", async () => {
    const onClose = mock();
    const onDelete = mock();

    render(
      <EventForm
        event={createEvent({ description: "Plan the launch" })}
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

    const event = dispatchDelete(descriptionField);

    expect(event.defaultPrevented).toBe(false);
    expect(onDelete).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("still deletes an existing event when Delete is pressed on a non-text form target", async () => {
    const onClose = mock();
    const onDelete = mock();

    render(
      <EventForm
        event={createEvent()}
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

    const event = dispatchDelete(form);

    expect(event.defaultPrevented).toBe(true);

    await waitFor(() => {
      expect(onDelete).toHaveBeenCalledTimes(1);
    });
  });

  it("rebases date and time controls during render when event dates change", () => {
    const event = createEvent();
    const nextEvent = {
      ...event,
      endDate: "2026-04-27T17:30:00.000Z",
      startDate: "2026-04-25T16:30:00.000Z",
    };

    const { rerender } = render(
      <EventForm
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

    rerender(
      <EventForm
        event={nextEvent}
        isDraft={false}
        isExistingEvent={true}
        onClose={mock()}
        onDelete={mock()}
        onDuplicate={mock()}
        onSubmit={mock()}
        setEvent={mock()}
      />,
    );

    const expected = getFormDates(nextEvent.startDate, nextEvent.endDate);
    const props = capturedDateControlsSectionProps?.dateTimeSectionProps;

    expect(props?.startTime).toEqual(expected.startTime);
    expect(props?.endTime).toEqual(expected.endTime);
    expect(props?.selectedStartDate).toEqual(expected.startDate);
    expect(props?.selectedEndDate).toEqual(expected.endDate);
    expect(props?.displayEndDate).toEqual(
      dayjs(expected.displayEndDate).toDate(),
    );
  });

  it("lets an untouched empty draft title keep normal arrow-key behavior", () => {
    const event = { ...createEvent(), title: "" };

    render(
      <EventForm
        event={event}
        isDraft={true}
        isExistingEvent={false}
        onClose={mock()}
        onDelete={mock()}
        onDuplicate={mock()}
        onSubmit={mock()}
        setEvent={mock()}
      />,
    );

    const titleField = screen.getByPlaceholderText("Title");
    const eventResult = dispatchArrowDown(titleField);

    expect(eventResult.defaultPrevented).toBe(false);
  });

  it("lets an untouched existing event title keep normal arrow-key behavior", () => {
    const event = { ...createEvent(), title: "Planning" };

    render(
      <EventForm
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

    const titleField = screen.getByPlaceholderText("Title");
    const eventResult = dispatchArrowDown(titleField);

    expect(eventResult.defaultPrevented).toBe(false);
  });

  it("lets the description field keep normal arrow-key behavior", () => {
    render(
      <EventForm
        event={createEvent({ description: "Plan the launch" })}
        isDraft={false}
        isExistingEvent={true}
        onClose={mock()}
        onDelete={mock()}
        onDuplicate={mock()}
        onSubmit={mock()}
        setEvent={mock()}
      />,
    );

    const descriptionField = screen.getByPlaceholderText("Description");
    const eventResult = dispatchArrowDown(descriptionField);

    expect(eventResult.defaultPrevented).toBe(false);
  });

  it("lets directly edited existing event titles keep normal arrow-key behavior", () => {
    const event = { ...createEvent(), title: "Planning" };

    render(
      <EventForm
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

    const titleField = screen.getByPlaceholderText("Title");
    fireEvent.pointerDown(titleField);
    const eventResult = dispatchArrowDown(titleField);

    expect(eventResult.defaultPrevented).toBe(false);
  });

  it("submits a typed draft title when Enter is pressed", async () => {
    const user = userEvent.setup();
    const onSubmit = mock();

    function Harness() {
      const [event, setEvent] = useState<Schema_Event>(
        createEvent({ _id: undefined, title: "" }),
      );
      const setEventFromForm = (
        nextEvent: SetStateAction<Schema_Event | null>,
      ) => {
        setEvent((currentEvent) => {
          const resolvedEvent =
            typeof nextEvent === "function"
              ? nextEvent(currentEvent)
              : nextEvent;

          return resolvedEvent ?? currentEvent;
        });
      };

      return (
        <EventForm
          event={event}
          isDraft={true}
          isExistingEvent={false}
          onClose={mock()}
          onDelete={mock()}
          onDuplicate={mock()}
          onSubmit={onSubmit}
          setEvent={setEventFromForm}
        />
      );
    }

    render(<Harness />);

    const titleField = screen.getByPlaceholderText("Title");
    titleField.focus();

    await user.type(titleField, "Plan");
    await user.keyboard("{Enter}");

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Plan" }),
    );
  });

  it("does not submit an existing event title with plain Enter", async () => {
    const user = userEvent.setup();
    const onSubmit = mock();

    render(
      <EventForm
        event={createEvent()}
        isDraft={true}
        isExistingEvent={true}
        onClose={mock()}
        onDelete={mock()}
        onDuplicate={mock()}
        onSubmit={onSubmit}
        setEvent={mock()}
      />,
    );

    const titleField = screen.getByPlaceholderText("Title");
    titleField.focus();

    await user.keyboard("{Enter}");

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("does not submit a draft when Enter is pressed outside the title field", async () => {
    const user = userEvent.setup();
    const onSubmit = mock();

    render(
      <>
        <button type="button">Draft block</button>
        <EventForm
          event={createEvent()}
          isDraft={true}
          isExistingEvent={false}
          onClose={mock()}
          onDelete={mock()}
          onDuplicate={mock()}
          onSubmit={onSubmit}
          setEvent={mock()}
        />
      </>,
    );

    await user.click(screen.getByRole("button", { name: "Draft block" }));

    await user.keyboard("{Enter}");

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("exposes the title input ref to the parent", () => {
    const titleInputRef = createRef<HTMLInputElement>();

    render(
      <EventForm
        event={createEvent()}
        isDraft={true}
        isExistingEvent={false}
        onClose={mock()}
        onDelete={mock()}
        onDuplicate={mock()}
        onSubmit={mock()}
        setEvent={mock()}
        titleInputRef={titleInputRef}
      />,
    );

    expect(titleInputRef.current).toBe(screen.getByPlaceholderText("Title"));
  });
});
