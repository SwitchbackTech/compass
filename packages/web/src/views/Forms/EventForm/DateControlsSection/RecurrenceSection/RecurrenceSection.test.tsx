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
}: {
  initialDraft?: GridEventDraft;
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

    return <RecurrenceSection draft={draft} setDraft={handleSetDraft} />;
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
});
