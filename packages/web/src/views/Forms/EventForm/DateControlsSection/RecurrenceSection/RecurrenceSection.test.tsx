import { act, fireEvent, render, screen } from "@testing-library/react";
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

const PAST_MIDNIGHT_SCHEDULE = EventScheduleSchema.parse({
  kind: "timed",
  start: "2026-08-03T23:00:00.000Z",
  end: "2026-08-04T00:30:00.000Z",
  timeZone: "UTC",
});

// A timed event that runs past local midnight: it starts on Aug 3 but its end
// lands on Aug 4. Recurrence is already on so the test can open Ends on
// without a userEvent click (those stall under CI popper/tooltip overlap).
const pastMidnightRecurringDraft = () => {
  const source = createMockEvent({
    schedule: PAST_MIDNIGHT_SCHEDULE,
    recurrence: {
      kind: "series",
      rules: ["RRULE:FREQ=WEEKLY;BYDAY=MO"],
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
        rules: ["RRULE:FREQ=WEEKLY;BYDAY=MO"],
      },
    },
  } as GridEventDraft;
};

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
  // running past local midnight disabled its own start date. userEvent.click
  // can stall for tens of seconds on CI when the tooltip/popper covers the
  // control; fireEvent avoids that retry loop.
  it("keeps the event's own date selectable when the event ends after midnight", () => {
    renderRecurrenceSection({ initialDraft: pastMidnightRecurringDraft() });
    act(() => {
      fireEvent.click(screen.getByRole("textbox"));
    });

    const ownDateLabel = /Monday, August 3rd, 2026/;
    for (let i = 0; i < 12 && !screen.queryByLabelText(ownDateLabel); i += 1) {
      act(() => {
        fireEvent.click(screen.getByRole("button", { name: "Previous month" }));
      });
    }

    const ownDate = screen.getByLabelText(ownDateLabel);
    expect(ownDate.getAttribute("aria-label")).toMatch(/^Choose /);
    expect(ownDate).not.toHaveClass("react-datepicker__day--disabled");
    expect(ownDate.getAttribute("aria-disabled")).not.toBe("true");
  });

  // Regression: EventFormShell stops mousedown bubbling, which used to leave
  // the Ends on calendar open after an outside click (focus left, popover stayed).
  it("closes the Ends on picker on outside click when mousedown propagation is stopped", () => {
    renderRecurrenceSection({
      initialDraft: recurringDraft(),
      withFormLikeStopPropagation: true,
    });

    act(() => {
      fireEvent.click(screen.getByRole("textbox"));
    });
    expect(screen.getAllByLabelText(/Choose .*2026/i).length).toBeGreaterThan(
      0,
    );

    act(() => {
      fireEvent.mouseDown(screen.getByRole("button", { name: "Outside" }));
    });

    expect(screen.queryAllByLabelText(/Choose .*2026/i)).toHaveLength(0);
  });

  // Regression: opening via TooltipTrigger onClick re-opened the popover when a
  // day click bubbled from the local portal; open only via the input path.
  it("closes the Ends on picker after selecting a day", () => {
    renderRecurrenceSection({ initialDraft: recurringDraft() });

    act(() => {
      fireEvent.click(screen.getByRole("textbox"));
    });
    const [day] = screen.getAllByLabelText(/^Choose /);
    act(() => {
      fireEvent.click(day);
    });

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
