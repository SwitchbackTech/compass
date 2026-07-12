import { HotkeyManager, resolveModifier } from "@tanstack/react-hotkeys";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, type SetStateAction, useState } from "react";
import { EventScheduleSchema } from "@core/types/event.contracts";
import dayjs from "@core/util/date/dayjs";
import { createMockEvent } from "@web/__tests__/utils/factories/event.factory";
import { type GridEventDraft } from "@web/events/event-draft.types";
import {
  createGridEventDraft,
  editGridEventDraft,
  replaceGridDraftSchedule,
  timedGridSchedule,
} from "@web/events/grid-event-draft.adapter";
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

// An "edit" GridEventDraft for an already-saved event, built from the strict
// `Event` contract via the same editGridEventDraft adapter production code
// uses (DayCalendarGrid.tsx, GridDraft.tsx).
const createEditDraft = (
  overrides: {
    description?: string;
    endDate?: string;
    startDate?: string;
    title?: string;
  } = {},
): GridEventDraft => {
  const {
    description = "",
    endDate = "2026-04-24T15:00:00.000Z",
    startDate = "2026-04-24T14:00:00.000Z",
    title = "Keyboard duplicate event",
  } = overrides;

  const event = createMockEvent({
    content: { kind: "details", title, description },
    schedule: EventScheduleSchema.parse({
      kind: "timed",
      start: startDate,
      end: endDate,
      timeZone: "UTC",
    }),
  });

  const draft = editGridEventDraft(event);
  if (!draft) throw new Error("expected an edit draft");

  return draft;
};

// A "create" GridEventDraft for a not-yet-saved draft (no source event).
const createNewDraft = (
  overrides: {
    endDate?: string;
    startDate?: string;
    title?: string;
  } = {},
): GridEventDraft => {
  const {
    endDate = "2026-04-24T15:00:00.000Z",
    startDate = "2026-04-24T14:00:00.000Z",
    title = "Unsaved draft",
  } = overrides;

  const draft = createGridEventDraft(
    timedGridSchedule(new Date(startDate), new Date(endDate)),
  );
  if (draft.kind !== "create") throw new Error("expected a create draft");

  return { ...draft, values: { ...draft.values, title } };
};

describe("EventForm", () => {
  beforeEach(() => {
    HotkeyManager.resetInstance();
    capturedDateControlsSectionProps = null;
    document.body.removeAttribute("data-app-locked");
  });

  it("renders the title before the actions on the same row", () => {
    render(
      <EventForm
        draft={createEditDraft({ description: "Plan the launch" })}
        isDraft={false}
        isExistingEvent={true}
        onClose={mock()}
        onDelete={mock()}
        onDuplicate={mock()}
        onSubmit={mock()}
        setDraft={mock()}
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
    const draft = createEditDraft();
    const onDuplicate = mock();

    render(
      <EventForm
        draft={draft}
        isDraft={false}
        isExistingEvent={true}
        onClose={mock()}
        onDelete={mock()}
        onDuplicate={onDuplicate}
        onSubmit={mock()}
        setDraft={mock()}
      />,
    );

    const titleField = screen.getByPlaceholderText("Title");
    titleField.focus();

    dispatchModD(titleField);

    await waitFor(() => {
      expect(onDuplicate).toHaveBeenCalledTimes(1);
    });
    expect(onDuplicate).toHaveBeenCalledWith(draft);
  });

  it("closes a draft event immediately when deleting from the menu", async () => {
    const user = userEvent.setup();
    const onClose = mock();
    const onDelete = mock();

    render(
      <EventForm
        draft={createNewDraft({ title: "Unsaved draft" })}
        isDraft={true}
        isExistingEvent={false}
        onClose={onClose}
        onDelete={onDelete}
        onDuplicate={mock()}
        onSubmit={mock()}
        setDraft={mock()}
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
        draft={createEditDraft()}
        isDraft={false}
        isExistingEvent={true}
        onClose={onClose}
        onDelete={onDelete}
        onDuplicate={mock()}
        onSubmit={mock()}
        setDraft={mock()}
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
        draft={createEditDraft({ description: "Plan the launch" })}
        isDraft={false}
        isExistingEvent={true}
        onClose={onClose}
        onDelete={onDelete}
        onDuplicate={mock()}
        onSubmit={mock()}
        setDraft={mock()}
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
        draft={createEditDraft()}
        isDraft={false}
        isExistingEvent={true}
        onClose={onClose}
        onDelete={onDelete}
        onDuplicate={mock()}
        onSubmit={mock()}
        setDraft={mock()}
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
    const draft = createEditDraft();
    const nextDraft = replaceGridDraftSchedule(draft, {
      kind: "timed",
      start: new Date("2026-04-25T16:30:00.000Z"),
      end: new Date("2026-04-27T17:30:00.000Z"),
      timeZone: "UTC",
    });

    const { rerender } = render(
      <EventForm
        draft={draft}
        isDraft={false}
        isExistingEvent={true}
        onClose={mock()}
        onDelete={mock()}
        onDuplicate={mock()}
        onSubmit={mock()}
        setDraft={mock()}
      />,
    );

    rerender(
      <EventForm
        draft={nextDraft}
        isDraft={false}
        isExistingEvent={true}
        onClose={mock()}
        onDelete={mock()}
        onDuplicate={mock()}
        onSubmit={mock()}
        setDraft={mock()}
      />,
    );

    const expected = getFormDates(
      "2026-04-25T16:30:00.000Z",
      "2026-04-27T17:30:00.000Z",
    );
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
    const draft = createNewDraft({ title: "" });

    render(
      <EventForm
        draft={draft}
        isDraft={true}
        isExistingEvent={false}
        onClose={mock()}
        onDelete={mock()}
        onDuplicate={mock()}
        onSubmit={mock()}
        setDraft={mock()}
      />,
    );

    const titleField = screen.getByPlaceholderText("Title");
    const eventResult = dispatchArrowDown(titleField);

    expect(eventResult.defaultPrevented).toBe(false);
  });

  it("lets an untouched existing event title keep normal arrow-key behavior", () => {
    const draft = createEditDraft({ title: "Planning" });

    render(
      <EventForm
        draft={draft}
        isDraft={false}
        isExistingEvent={true}
        onClose={mock()}
        onDelete={mock()}
        onDuplicate={mock()}
        onSubmit={mock()}
        setDraft={mock()}
      />,
    );

    const titleField = screen.getByPlaceholderText("Title");
    const eventResult = dispatchArrowDown(titleField);

    expect(eventResult.defaultPrevented).toBe(false);
  });

  it("lets the description field keep normal arrow-key behavior", () => {
    render(
      <EventForm
        draft={createEditDraft({ description: "Plan the launch" })}
        isDraft={false}
        isExistingEvent={true}
        onClose={mock()}
        onDelete={mock()}
        onDuplicate={mock()}
        onSubmit={mock()}
        setDraft={mock()}
      />,
    );

    const descriptionField = screen.getByPlaceholderText("Description");
    const eventResult = dispatchArrowDown(descriptionField);

    expect(eventResult.defaultPrevented).toBe(false);
  });

  it("lets directly edited existing event titles keep normal arrow-key behavior", () => {
    const draft = createEditDraft({ title: "Planning" });

    render(
      <EventForm
        draft={draft}
        isDraft={false}
        isExistingEvent={true}
        onClose={mock()}
        onDelete={mock()}
        onDuplicate={mock()}
        onSubmit={mock()}
        setDraft={mock()}
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
      const [draft, setDraftState] = useState<GridEventDraft>(
        createNewDraft({ title: "" }),
      );
      const setDraftFromForm = (
        nextDraft: SetStateAction<GridEventDraft | null>,
      ) => {
        setDraftState((currentDraft) => {
          const resolvedDraft =
            typeof nextDraft === "function"
              ? nextDraft(currentDraft)
              : nextDraft;

          return resolvedDraft ?? currentDraft;
        });
      };

      return (
        <EventForm
          draft={draft}
          isDraft={true}
          isExistingEvent={false}
          onClose={mock()}
          onDelete={mock()}
          onDuplicate={mock()}
          onSubmit={onSubmit}
          setDraft={setDraftFromForm}
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
      expect.objectContaining({
        values: expect.objectContaining({ title: "Plan" }),
      }),
    );
  });

  it("does not submit an existing event title with plain Enter", async () => {
    const user = userEvent.setup();
    const onSubmit = mock();

    render(
      <EventForm
        draft={createEditDraft()}
        isDraft={true}
        isExistingEvent={true}
        onClose={mock()}
        onDelete={mock()}
        onDuplicate={mock()}
        onSubmit={onSubmit}
        setDraft={mock()}
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
          draft={createEditDraft()}
          isDraft={true}
          isExistingEvent={false}
          onClose={mock()}
          onDelete={mock()}
          onDuplicate={mock()}
          onSubmit={onSubmit}
          setDraft={mock()}
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
        draft={createEditDraft()}
        isDraft={true}
        isExistingEvent={false}
        onClose={mock()}
        onDelete={mock()}
        onDuplicate={mock()}
        onSubmit={mock()}
        setDraft={mock()}
        titleInputRef={titleInputRef}
      />,
    );

    expect(titleInputRef.current).toBe(screen.getByPlaceholderText("Title"));
  });
});
