import { HotkeyManager, resolveModifier } from "@tanstack/react-hotkeys";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { act, type SetStateAction, useState } from "react";
import { type EventId } from "@core/types/domain-primitives";
import { EventScheduleSchema } from "@core/types/event.contracts";
import dayjs from "@core/util/date/dayjs";
import {
  createStoreWrapper,
  renderWithStore,
} from "@web/__tests__/render-with-store";
import { toNormalizedEventQueryData } from "@web/__tests__/utils/event-query-test-data";
import { createMockEvent } from "@web/__tests__/utils/factories/event.factory";
import { Categories_Event } from "@web/common/types/web.event.types";
import { type GridEventDraft } from "@web/events/event-draft.types";
import {
  createGridEventDraft,
  editGridEventDraft,
  replaceGridDraftSchedule,
  timedGridSchedule,
} from "@web/events/grid-event-draft.adapter";
import { eventQueryKeys } from "@web/events/queries/event.query.keys";
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
  eventCategory: Categories_Event;
  onToggleAllDay: (checked: boolean) => void;
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

interface CapturedRecurrenceSectionProps {
  event: { recurrence?: { rule?: unknown; eventId?: unknown } };
}

let capturedRecurrenceSectionProps: CapturedRecurrenceSectionProps | null =
  null;

mock.module(
  "@web/views/Forms/EventForm/DateControlsSection/RecurrenceSection/RecurrenceSection",
  () => ({
    RecurrenceSection: (props: CapturedRecurrenceSectionProps) => {
      capturedRecurrenceSectionProps = props;
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

mock.module("@web/views/Forms/EventForm/SaveSection", () => ({
  SaveSection: ({ onSubmit }: { onSubmit: () => void }) => (
    <button type="button" onClick={onSubmit}>
      Save
    </button>
  ),
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
  overrides: { endDate?: string; startDate?: string; title?: string } = {},
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

const createAllDayDraft = (): GridEventDraft =>
  createGridEventDraft({
    kind: "allDay",
    start: new Date("2026-04-24T00:00:00"),
    end: new Date("2026-04-25T00:00:00"),
  });

describe("EventForm", () => {
  beforeEach(() => {
    HotkeyManager.resetInstance();
    capturedDateControlsSectionProps = null;
    capturedRecurrenceSectionProps = null;
    document.body.removeAttribute("data-app-locked");
  });

  it("renders the title before the actions on the same row", () => {
    renderWithStore(
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

  it("renders as a transparent sidebar column with the save footer after the fields", () => {
    renderWithStore(
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

    // Regression guard for the old floating-card look: the form root used to
    // paint an opaque `--event-form-bg` tint over the sidebar background.
    const form = screen.getByRole("form");
    expect(form.style.getPropertyValue("--event-form-bg")).toBe("");

    // The save footer is pinned outside the scrollable field body, so it must
    // follow the description in DOM order.
    const description = screen.getByPlaceholderText("Description");
    const save = screen.getByRole("button", { name: "Save" });
    expect(
      description.compareDocumentPosition(save) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("duplicates the event with Mod+D while the title field is focused", async () => {
    const draft = createEditDraft();
    const onDuplicate = mock();

    renderWithStore(
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
    act(() => titleField.focus());

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

    renderWithStore(
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

    renderWithStore(
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
    act(() => titleField.focus());

    const event = dispatchDelete(titleField);

    expect(event.defaultPrevented).toBe(false);
    expect(onDelete).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("does not delete an existing event when Delete is pressed in the description field", async () => {
    const onClose = mock();
    const onDelete = mock();

    renderWithStore(
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
    act(() => descriptionField.focus());

    const event = dispatchDelete(descriptionField);

    expect(event.defaultPrevented).toBe(false);
    expect(onDelete).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("still deletes an existing event when Delete is pressed on a non-text form target", async () => {
    const onClose = mock();
    const onDelete = mock();

    renderWithStore(
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
    act(() => form.focus());

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

    const { rerender } = renderWithStore(
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

  it("changes a draft to all day immediately and saves it as all day", async () => {
    const user = userEvent.setup();
    const onSubmit = mock();

    function Harness() {
      const [draft, setDraft] = useState<GridEventDraft | null>(
        createNewDraft(),
      );

      if (!draft) return null;

      return (
        <EventForm
          draft={draft}
          isDraft
          isExistingEvent={false}
          onClose={mock()}
          onDelete={mock()}
          onDuplicate={mock()}
          onSubmit={onSubmit}
          setDraft={setDraft}
        />
      );
    }

    renderWithStore(<Harness />);

    act(() => capturedDateControlsSectionProps?.onToggleAllDay(true));

    expect(capturedDateControlsSectionProps?.eventCategory).toBe(
      Categories_Event.ALLDAY,
    );

    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        values: expect.objectContaining({
          schedule: expect.objectContaining({ kind: "allDay" }),
        }),
      }),
    );
  });

  it("keeps every day covered by a cross-day timed draft when switching to all day", async () => {
    const user = userEvent.setup();
    const onSubmit = mock();

    function Harness() {
      const [draft, setDraft] = useState<GridEventDraft | null>(
        createNewDraft({
          startDate: "2026-04-24T14:00:00.000Z",
          endDate: "2026-04-25T15:00:00.000Z",
        }),
      );

      if (!draft) return null;

      return (
        <EventForm
          draft={draft}
          isDraft
          isExistingEvent={false}
          onClose={mock()}
          onDelete={mock()}
          onDuplicate={mock()}
          onSubmit={onSubmit}
          setDraft={setDraft}
        />
      );
    }

    renderWithStore(<Harness />);

    act(() => capturedDateControlsSectionProps?.onToggleAllDay(true));
    await user.click(screen.getByRole("button", { name: "Save" }));

    const savedDraft = onSubmit.mock.calls[0]?.[0] as GridEventDraft;
    expect(savedDraft.values.schedule).toMatchObject({ kind: "allDay" });
    if (savedDraft.values.schedule.kind !== "allDay") {
      throw new Error("expected an all-day schedule");
    }
    expect(dayjs(savedDraft.values.schedule.end).toYearMonthDayString()).toBe(
      "2026-04-26",
    );
  });

  it("changes an all-day draft to a timed event that can be saved", async () => {
    const user = userEvent.setup();
    const onSubmit = mock();

    function Harness() {
      const [draft, setDraft] = useState<GridEventDraft | null>(
        createAllDayDraft(),
      );

      if (!draft) return null;

      return (
        <EventForm
          draft={draft}
          isDraft
          isExistingEvent={false}
          onClose={mock()}
          onDelete={mock()}
          onDuplicate={mock()}
          onSubmit={onSubmit}
          setDraft={setDraft}
        />
      );
    }

    renderWithStore(<Harness />);

    act(() => capturedDateControlsSectionProps?.onToggleAllDay(false));

    expect(capturedDateControlsSectionProps?.eventCategory).toBe(
      Categories_Event.TIMED,
    );

    await user.click(screen.getByRole("button", { name: "Save" }));

    const savedDraft = onSubmit.mock.calls[0]?.[0] as GridEventDraft;
    expect(savedDraft.values.schedule).toMatchObject({ kind: "timed" });
    if (savedDraft.values.schedule.kind !== "timed") {
      throw new Error("expected a timed schedule");
    }
    expect(
      savedDraft.values.schedule.end.getTime() -
        savedDraft.values.schedule.start.getTime(),
    ).toBe(60 * 60 * 1000);
  });

  it("lets an untouched empty draft title keep normal arrow-key behavior", () => {
    const draft = createNewDraft({ title: "" });

    renderWithStore(
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

    renderWithStore(
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
    renderWithStore(
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

    renderWithStore(
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

    renderWithStore(<Harness />);

    const titleField = screen.getByPlaceholderText("Title");
    act(() => titleField.focus());

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

    renderWithStore(
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
    act(() => titleField.focus());

    await user.keyboard("{Enter}");

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("does not submit a draft when Enter is pressed outside the title field", async () => {
    const user = userEvent.setup();
    const onSubmit = mock();

    renderWithStore(
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

  it("hydrates an occurrence's recurrence from its cached series base, and keeps it preserved through a title edit", async () => {
    const user = userEvent.setup();
    const onSubmit = mock();
    const seriesId = "0123456789abcdef11111111" as EventId;
    const seriesRules = ["RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE"];
    const seriesBase = createMockEvent({
      id: seriesId,
      content: { kind: "details", title: "Standup", description: "" },
      schedule: EventScheduleSchema.parse({
        kind: "timed",
        start: "2026-04-20T14:00:00.000Z",
        end: "2026-04-20T15:00:00.000Z",
        timeZone: "UTC",
      }),
      recurrence: { kind: "series", rules: seriesRules },
    });
    const occurrence = createMockEvent({
      content: { kind: "details", title: "Standup", description: "" },
      schedule: EventScheduleSchema.parse({
        kind: "timed",
        start: "2026-04-27T14:00:00.000Z",
        end: "2026-04-27T15:00:00.000Z",
        timeZone: "UTC",
      }),
      recurrence: { kind: "occurrence", seriesId },
    });
    const draft = editGridEventDraft(occurrence);
    if (!draft) throw new Error("expected an edit draft");

    const { queryClient, wrapper } = createStoreWrapper();
    // useEventById reads the cache synchronously on mount - the base must be
    // present before the first render, not seeded after (setQueryDefaults'
    // `initialData`, which seedEventQueries relies on, never materializes
    // without a mounted query for that exact key).
    queryClient.setQueryData(
      eventQueryKeys.week({
        source: "local",
        start: "2026-04-20T00:00:00.000Z",
        end: "2026-04-27T00:00:00.000Z",
      }),
      toNormalizedEventQueryData([seriesBase]),
    );

    function Harness() {
      const [currentDraft, setDraft] = useState<GridEventDraft | null>(draft);
      if (!currentDraft) return null;

      return (
        <EventForm
          draft={currentDraft}
          isDraft={false}
          isExistingEvent={true}
          onClose={mock()}
          onDelete={mock()}
          onDuplicate={mock()}
          onSubmit={onSubmit}
          setDraft={setDraft}
        />
      );
    }

    render(<Harness />, { wrapper });

    // The occurrence's own recurrence pointer carries no rule - this only
    // passes once EventForm resolves the series base and threads its rules
    // through, which is what lets RecurrenceSection auto-expand with the
    // real rule instead of reading the event as non-recurring.
    expect(capturedRecurrenceSectionProps?.event.recurrence).toMatchObject({
      eventId: seriesId,
      rule: seriesRules,
    });

    const titleField = screen.getByPlaceholderText("Title");
    await user.clear(titleField);
    await user.type(titleField, "Standup (moved)");
    await user.click(screen.getByRole("button", { name: "Save" }));

    // A field edit that never touches recurrence must not flip the draft
    // from "preserve" to an explicit series conversion - the adapter's
    // no-op guard compares the hydrated rule against what the patch echoes
    // back, since every field patch spreads the whole projected event.
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        values: expect.objectContaining({
          title: "Standup (moved)",
          recurrence: { kind: "preserve" },
        }),
      }),
    );
  });
});
