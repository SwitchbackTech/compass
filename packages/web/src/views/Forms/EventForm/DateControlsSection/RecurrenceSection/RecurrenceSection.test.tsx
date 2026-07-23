import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useCallback, useState, type Dispatch, type SetStateAction } from "react";
import { EventScheduleSchema } from "@core/types/event.contracts";
import { createMockEvent } from "@web/__tests__/utils/factories/event.factory";
import { type GridEventDraft } from "@web/events/event-draft.types";
import {
  createGridEventDraft,
  editGridEventDraft,
} from "@web/events/grid-event-draft.adapter";
import { createRecurrenceSection } from "./createRecurrenceSection";
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
  authenticated,
  isBackendUnavailable = false,
  initialDraft = baseDraft(),
}: {
  authenticated: boolean;
  isBackendUnavailable?: boolean;
  initialDraft?: GridEventDraft;
}) {
  const setAuthenticated = mock();
  const setDraftSpy = mock();
  const RecurrenceSection = createRecurrenceSection({
    isBackendUnavailable: () => isBackendUnavailable,
    useSession: () => ({ authenticated, setAuthenticated }),
  });

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

    return (
      <RecurrenceSection draft={draft} setDraft={handleSetDraft} />
    );
  }

  const view = render(<Harness />);

  return { ...view, setDraftSpy };
}

describe("RecurrenceSection", () => {
  it("keeps recurrence settings hidden for local users", async () => {
    const user = userEvent.setup();
    const { setDraftSpy } = renderRecurrenceSection({ authenticated: false });

    const repeatButton = screen.getByRole("button", { name: /repeat/i });

    expect(repeatButton).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByText("Repeat")).toBeInTheDocument();
    expect(
      screen.queryByText("Sign in to use recurring events."),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Every")).not.toBeInTheDocument();
    expect(screen.queryByText("Ends on:")).not.toBeInTheDocument();

    await user.hover(repeatButton);
    await waitFor(() => {
      expect(
        screen.getByText("Sign in to use recurring events."),
      ).toBeInTheDocument();
    });

    await user.click(repeatButton);

    expect(screen.queryByText("Every")).not.toBeInTheDocument();
    expect(screen.queryByText("Ends on:")).not.toBeInTheDocument();
    expect(setDraftSpy).not.toHaveBeenCalled();
  });

  it("shows the sign-in requirement before sign-in when the backend is unavailable", async () => {
    const user = userEvent.setup();
    renderRecurrenceSection({
      authenticated: false,
      isBackendUnavailable: true,
    });
    const repeatButton = screen.getByRole("button", { name: /repeat/i });

    expect(
      screen.queryByText(
        "Start the Compass backend and MongoDB to use recurring events.",
      ),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("Sign in to use recurring events."),
    ).not.toBeInTheDocument();
    expect(repeatButton).toHaveAttribute("aria-disabled", "true");

    await user.hover(repeatButton);
    await waitFor(() => {
      expect(
        screen.getByText("Sign in to use recurring events."),
      ).toBeInTheDocument();
    });
  });

  it("keeps recurrence settings hidden with the sign-in message when a signed-in user's backend is unavailable", async () => {
    const user = userEvent.setup();
    const { setDraftSpy } = renderRecurrenceSection({
      authenticated: true,
      isBackendUnavailable: true,
    });
    const repeatButton = screen.getByRole("button", { name: /repeat/i });

    expect(repeatButton).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByText("Repeat")).toBeInTheDocument();
    expect(
      screen.queryByText(
        "Start the Compass backend and MongoDB to use recurring events.",
      ),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Every")).not.toBeInTheDocument();
    expect(screen.queryByText("Ends on:")).not.toBeInTheDocument();

    await user.hover(repeatButton);
    await waitFor(() => {
      expect(
        screen.getByText("Sign in to use recurring events."),
      ).toBeInTheDocument();
    });

    await user.click(repeatButton);

    expect(screen.queryByText("Every")).not.toBeInTheDocument();
    expect(screen.queryByText("Ends on:")).not.toBeInTheDocument();
    expect(setDraftSpy).not.toHaveBeenCalled();
  });

  it("shows recurrence settings after signed-in users enable repeat", async () => {
    const user = userEvent.setup();
    renderRecurrenceSection({ authenticated: true });
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
      authenticated: true,
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
