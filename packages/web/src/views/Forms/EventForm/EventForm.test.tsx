import { HotkeyManager, resolveModifier } from "@tanstack/react-hotkeys";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, type SetStateAction, useState } from "react";
import { ThemeProvider } from "styled-components";
import { Origin, Priorities } from "@core/constants/core.constants";
import { type Schema_Event } from "@core/types/event.types";
import dayjs from "@core/util/date/dayjs";
import { theme } from "@web/common/styles/theme";
import { type Props as DateTimeSectionProps } from "@web/views/Forms/EventForm/DateControlsSection/DateTimeSection/DateTimeSection";
import { getFormDates } from "@web/views/Forms/EventForm/DateControlsSection/DateTimeSection/form.datetime.util";
import { beforeEach, describe, expect, it, mock } from "bun:test";

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

mock.module(
  "@web/views/Forms/EventForm/DateControlsSection/RecurrenceSection/RecurrenceSection",
  () => ({
    RecurrenceSection: () => null,
  }),
);

mock.module("@web/views/Forms/EventForm/EventActionMenu", () => ({
  EventActionMenu: () => null,
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

  it("duplicates the event with Mod+D while the title field is focused", async () => {
    const event = createEvent();
    const onDuplicate = mock();

    render(
      <ThemeProvider theme={theme}>
        <EventForm
          event={event}
          isDraft={false}
          isExistingEvent={true}
          onClose={mock()}
          onDelete={mock()}
          onDuplicate={onDuplicate}
          onSubmit={mock()}
          setEvent={mock()}
        />
      </ThemeProvider>,
    );

    const titleField = screen.getByPlaceholderText("Title");
    titleField.focus();

    dispatchModD(titleField);

    await waitFor(() => {
      expect(onDuplicate).toHaveBeenCalledTimes(1);
    });
    expect(onDuplicate).toHaveBeenCalledWith(event);
  });

  it("marks the title field as text editing after the user changes it", async () => {
    const user = userEvent.setup();
    const event = { ...createEvent(), title: "" };
    const onDraftTitleArrowKey = mock(() => true);

    render(
      <ThemeProvider theme={theme}>
        <EventForm
          event={event}
          isDraft={true}
          isExistingEvent={false}
          onClose={mock()}
          onDelete={mock()}
          onDuplicate={mock()}
          onDraftTitleArrowKey={onDraftTitleArrowKey}
          onSubmit={mock()}
          setEvent={mock()}
        />
      </ThemeProvider>,
    );

    const titleField = screen.getByPlaceholderText("Title");

    const beforeTyping = dispatchArrowDown(titleField);

    expect(onDraftTitleArrowKey).toHaveBeenCalledTimes(1);
    expect(beforeTyping.defaultPrevented).toBe(true);

    await user.type(titleField, "Plan");
    onDraftTitleArrowKey.mockClear();
    const afterTyping = dispatchArrowDown(titleField);

    expect(onDraftTitleArrowKey).not.toHaveBeenCalled();
    expect(afterTyping.defaultPrevented).toBe(false);
  });

  it("resets title editing state when an unsaved draft session changes", async () => {
    const user = userEvent.setup();
    const event = { ...createEvent(), _id: undefined, title: "" };
    const onDraftTitleArrowKey = mock(() => true);

    const { rerender } = render(
      <ThemeProvider theme={theme}>
        <EventForm
          event={event}
          isDraft={true}
          isExistingEvent={false}
          onClose={mock()}
          onDelete={mock()}
          onDuplicate={mock()}
          onDraftTitleArrowKey={onDraftTitleArrowKey}
          onSubmit={mock()}
          setEvent={mock()}
          titleEditingResetKey={1}
        />
      </ThemeProvider>,
    );

    const titleField = screen.getByPlaceholderText("Title");
    await user.type(titleField, "Plan");
    onDraftTitleArrowKey.mockClear();
    dispatchArrowDown(titleField);
    expect(onDraftTitleArrowKey).not.toHaveBeenCalled();

    rerender(
      <ThemeProvider theme={theme}>
        <EventForm
          event={event}
          isDraft={true}
          isExistingEvent={false}
          onClose={mock()}
          onDelete={mock()}
          onDuplicate={mock()}
          onDraftTitleArrowKey={onDraftTitleArrowKey}
          onSubmit={mock()}
          setEvent={mock()}
          titleEditingResetKey={2}
        />
      </ThemeProvider>,
    );

    await waitFor(() => {
      dispatchArrowDown(titleField);
      expect(onDraftTitleArrowKey).toHaveBeenCalledTimes(1);
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
      <ThemeProvider theme={theme}>
        <EventForm
          event={event}
          isDraft={false}
          isExistingEvent={true}
          onClose={mock()}
          onDelete={mock()}
          onDuplicate={mock()}
          onSubmit={mock()}
          setEvent={mock()}
        />
      </ThemeProvider>,
    );

    rerender(
      <ThemeProvider theme={theme}>
        <EventForm
          event={nextEvent}
          isDraft={false}
          isExistingEvent={true}
          onClose={mock()}
          onDelete={mock()}
          onDuplicate={mock()}
          onSubmit={mock()}
          setEvent={mock()}
        />
      </ThemeProvider>,
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

  it("moves an untouched empty draft title with arrow keys", () => {
    const event = { ...createEvent(), title: "" };
    const onDraftTitleArrowKey = mock(() => true);

    render(
      <ThemeProvider theme={theme}>
        <EventForm
          event={event}
          isDraft={true}
          isExistingEvent={false}
          onClose={mock()}
          onDelete={mock()}
          onDraftTitleArrowKey={onDraftTitleArrowKey}
          onDuplicate={mock()}
          onSubmit={mock()}
          setEvent={mock()}
        />
      </ThemeProvider>,
    );

    const titleField = screen.getByPlaceholderText("Title");
    const eventResult = dispatchArrowDown(titleField);

    expect(onDraftTitleArrowKey).toHaveBeenCalledWith("ArrowDown");
    expect(eventResult.defaultPrevented).toBe(true);
  });

  it("moves an untouched existing event draft title with arrow keys", () => {
    const event = { ...createEvent(), title: "Planning" };
    const onDraftTitleArrowKey = mock(() => true);

    render(
      <ThemeProvider theme={theme}>
        <EventForm
          event={event}
          isDraft={false}
          isExistingEvent={true}
          onClose={mock()}
          onDelete={mock()}
          onDraftTitleArrowKey={onDraftTitleArrowKey}
          onDuplicate={mock()}
          onSubmit={mock()}
          setEvent={mock()}
        />
      </ThemeProvider>,
    );

    const titleField = screen.getByPlaceholderText("Title");
    const eventResult = dispatchArrowDown(titleField);

    expect(onDraftTitleArrowKey).toHaveBeenCalledWith("ArrowDown");
    expect(eventResult.defaultPrevented).toBe(true);
  });

  it("lets directly edited existing event titles keep normal arrow-key behavior", () => {
    const event = { ...createEvent(), title: "Planning" };
    const onDraftTitleArrowKey = mock(() => true);

    render(
      <ThemeProvider theme={theme}>
        <EventForm
          event={event}
          isDraft={false}
          isExistingEvent={true}
          onClose={mock()}
          onDelete={mock()}
          onDraftTitleArrowKey={onDraftTitleArrowKey}
          onDuplicate={mock()}
          onSubmit={mock()}
          setEvent={mock()}
        />
      </ThemeProvider>,
    );

    const titleField = screen.getByPlaceholderText("Title");
    fireEvent.pointerDown(titleField);
    const eventResult = dispatchArrowDown(titleField);

    expect(onDraftTitleArrowKey).not.toHaveBeenCalled();
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
        <ThemeProvider theme={theme}>
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
        </ThemeProvider>
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
      <ThemeProvider theme={theme}>
        <EventForm
          event={createEvent()}
          isDraft={true}
          isExistingEvent={true}
          onClose={mock()}
          onDelete={mock()}
          onDuplicate={mock()}
          onSubmit={onSubmit}
          setEvent={mock()}
        />
      </ThemeProvider>,
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
      <ThemeProvider theme={theme}>
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
      </ThemeProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Draft block" }));

    await user.keyboard("{Enter}");

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("exposes the title input ref to the parent", () => {
    const titleInputRef = createRef<HTMLInputElement>();

    render(
      <ThemeProvider theme={theme}>
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
        />
      </ThemeProvider>,
    );

    expect(titleInputRef.current).toBe(screen.getByPlaceholderText("Title"));
  });
});
