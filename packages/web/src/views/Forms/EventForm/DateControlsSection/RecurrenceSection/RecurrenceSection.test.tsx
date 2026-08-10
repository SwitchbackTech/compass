import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useState,
} from "react";
import { EventScheduleSchema } from "@core/types/event.contracts";
import { createMockEvent } from "@web/__tests__/utils/factories/event.factory";
import { type GridEventDraft } from "@web/events/event-draft.types";
import {
  createGridEventDraft,
  editGridEventDraft,
} from "@web/events/grid-event-draft.adapter";
// Import the implementation module directly: EventForm.test.tsx mocks the
// app-facing ./RecurrenceSection path process-wide (bun's mock.module leaks
// across files), which would null the component out here.
import { RecurrenceSection } from "./RecurrenceSectionView";
import { describe, expect, it, mock } from "bun:test";

const SCHEDULE = EventScheduleSchema.parse({
  kind: "timed",
  start: "2026-04-24T14:00:00.000Z",
  end: "2026-04-24T15:00:00.000Z",
  timeZone: "UTC",
});

const baseDraft = () =>
  createGridEventDraft({
    kind: "timed",
    start: new Date("2026-04-24T14:00:00.000Z"),
    end: new Date("2026-04-24T15:00:00.000Z"),
    timeZone: "UTC",
  });

// A timed event that runs past local midnight: it starts on Aug 3 but its end
// lands on Aug 4. The "Ends on" floor is anchored to the start date, so the
// event's own date (Aug 3) stays selectable.
const pastMidnightDraft = () =>
  createGridEventDraft({
    kind: "timed",
    start: new Date("2026-08-03T23:00:00.000Z"),
    end: new Date("2026-08-04T00:30:00.000Z"),
    timeZone: "UTC",
  });

const recurringDraft = () => {
  const source = createMockEvent({
    schedule: SCHEDULE,
    recurrence: {
      kind: "series",
      rules: ["RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE"],
    },
  });
  const draft = editGridEventDraft(source);
  if (!draft) throw new Error("expected edit draft");

  return {
    ...draft,
    values: {
      ...draft.values,
      recurrence: {
        kind: "series" as const,
        rules: ["RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE"],
      },
    },
  } as GridEventDraft;
};

function renderRecurrenceSection({
  initialDraft = baseDraft(),
  withFormLikeStopPropagation = false,
}: {
  initialDraft?: GridEventDraft;
  // EventForm stops mousedown bubbling so week-grid handlers underneath do
  // not fire. That also breaks react-datepicker's bubble-phase outside-click
  // listener; opt in to reproduce that shell when testing popover close.
  withFormLikeStopPropagation?: boolean;
} = {}) {
  const setDraftSpy = mock();

  function Harness() {
    const [draft, setDraft] = useState<GridEventDraft>(initialDraft);
    const handleSetDraft = useCallback<
      Dispatch<SetStateAction<GridEventDraft | null>>
    >((nextDraft) => {
      setDraftSpy(nextDraft);
      setDraft((current) => {
        const resolved =
          typeof nextDraft === "function" ? nextDraft(current) : nextDraft;
        if (!resolved) throw new Error("expected draft");
        return resolved;
      });
    }, []);

    const section = (
      <RecurrenceSection draft={draft} setDraft={handleSetDraft} />
    );

    if (!withFormLikeStopPropagation) return section;

    return (
      // biome-ignore lint/a11y/noStaticElementInteractions: test harness mirrors EventFormShell's mousedown stopPropagation.
      <div
        onMouseDown={(event) => {
          event.stopPropagation();
        }}
      >
        {section}
        <button type="button">Outside</button>
      </div>
    );
  }

  const view = render(<Harness />);

  return { ...view, setDraftSpy };
}

describe("RecurrenceSection", () => {
  // No auth gate: local (IndexedDB) mode supports recurrence via read-time
  // expansion, so the toggle is enabled for anonymous users too.
  it("shows recurrence settings after enabling repeat", async () => {
    const user = userEvent.setup();
    renderRecurrenceSection();
    const repeatButton = screen.getByRole("button", {
      name: /edit recurrence/i,
    });

    expect(screen.queryByText("Every")).not.toBeInTheDocument();
    expect(repeatButton).not.toHaveAttribute("aria-disabled");

    await user.click(repeatButton);

    expect(await screen.findByText("Every")).toBeInTheDocument();
    expect(screen.getByText("Ends on:")).toBeInTheDocument();
  });

  it("shows an existing recurring event's controls immediately, with the stored weekdays filled in", () => {
    const { container } = renderRecurrenceSection({
      initialDraft: recurringDraft(),
    });

    expect(screen.getByText("Every")).toBeInTheDocument();
    expect(screen.getByText("Ends on:")).toBeInTheDocument();

    const selected = [...container.querySelectorAll("[data-selected]")].map(
      (button) => button.getAttribute("data-selected"),
    );
    expect(selected).toEqual([
      "false",
      "true",
      "true",
      "true",
      "false",
      "false",
      "false",
    ]);
  });

  // Regression: the "Ends on" floor used to be the event's *end*, so an event
  // running past local midnight (end on the next calendar day) disabled its own
  // start date - the date the user most naturally picks. react-datepicker
  // compares day cells by calendar day, so the fix is to anchor the floor to
  // the start date. See RecurrenceSectionView's recurrenceMinDate.
  it("keeps the event's own date selectable when the event ends after midnight", async () => {
    const user = userEvent.setup();
    renderRecurrenceSection({ initialDraft: pastMidnightDraft() });

    // Enable recurrence to reveal the "Ends on" picker, then open it via its
    // input and assert the event's own (start) date is offered, not blocked.
    await user.click(screen.getByRole("button", { name: /edit recurrence/i }));
    await user.click(await screen.findByRole("textbox"));

    const ownDate = await screen.findByLabelText(/Monday, August 3rd, 2026/);
    expect(ownDate.getAttribute("aria-label")).toMatch(/^Choose /);
    expect(ownDate).not.toHaveClass("react-datepicker__day--disabled");
    expect(ownDate.getAttribute("aria-disabled")).not.toBe("true");
  });

  // Regression: EventFormShell stops mousedown bubbling, which used to leave
  // the Ends on calendar open after an outside click (focus left, popover stayed).
  it("closes the Ends on picker on outside click when mousedown propagation is stopped", async () => {
    const user = userEvent.setup();
    renderRecurrenceSection({
      initialDraft: recurringDraft(),
      withFormLikeStopPropagation: true,
    });

    await user.click(await screen.findByRole("textbox"));
    expect(
      (await screen.findAllByLabelText(/Choose .*2026/i)).length,
    ).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: "Outside" }));

    expect(screen.queryAllByLabelText(/Choose .*2026/i)).toHaveLength(0);
  });

  // Regression: opening via TooltipTrigger onClick re-opened the popover when a
  // day click bubbled from the local portal; open only via the input path.
  it("closes the Ends on picker after selecting a day", async () => {
    const user = userEvent.setup();
    renderRecurrenceSection({ initialDraft: recurringDraft() });

    await user.click(await screen.findByRole("textbox"));
    const [day] = await screen.findAllByLabelText(/^Choose /);
    await user.click(day);

    expect(screen.queryAllByLabelText(/^Choose /)).toHaveLength(0);
  });

  it("turning off Repeat on an existing recurring event clears the controls", async () => {
    // Guards against the toggle being a no-op on an edit draft: clearing
    // recurrence used to resolve to "preserve", which read the source
    // event's original rules right back and left hasRecurrence stuck true.
    const user = userEvent.setup();
    renderRecurrenceSection({ initialDraft: recurringDraft() });

    const repeatButton = screen.getByRole("button", { name: /repeat/i });
    expect(repeatButton).toHaveAttribute("data-repeat", "true");
    expect(screen.getByText("Every")).toBeInTheDocument();

    await user.click(repeatButton);

    expect(repeatButton).toHaveAttribute("data-repeat", "false");
    expect(screen.queryByText("Every")).not.toBeInTheDocument();
    expect(screen.queryByText("Ends on:")).not.toBeInTheDocument();
  });
});
