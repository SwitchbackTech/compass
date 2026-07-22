import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useCallback, useState } from "react";
import { Origin } from "@core/constants/core.constants";
import { type CompassEvent } from "@core/types/compass-event.contracts";
import { type GridEvent } from "@web/common/types/web.event.types";
import { assembleGridEvent } from "@web/common/utils/event/event.util";
import { createRecurrenceSection } from "./RecurrenceSection";
import { describe, expect, it, mock } from "bun:test";

const baseEvent = (): GridEvent =>
  assembleGridEvent({
    _id: "event-1",
    title: "Test Event",
    description: "",
    startDate: "2026-04-24T14:00:00.000Z",
    endDate: "2026-04-24T15:00:00.000Z",
    origin: Origin.COMPASS,
    user: "user-1",
  });

const recurringEvent = (): GridEvent =>
  assembleGridEvent({
    _id: "event-2",
    title: "Standup",
    description: "",
    startDate: "2026-04-27T14:00:00.000Z",
    endDate: "2026-04-27T15:00:00.000Z",
    origin: Origin.COMPASS,
    user: "user-1",
    recurrence: { rule: ["RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE"] },
  });

function renderRecurrenceSection({
  authenticated,
  isBackendUnavailable = false,
  initialEvent = baseEvent(),
}: {
  authenticated: boolean;
  isBackendUnavailable?: boolean;
  initialEvent?: GridEvent;
}) {
  const setAuthenticated = mock();
  const setEventSpy = mock();
  const RecurrenceSection = createRecurrenceSection({
    isBackendUnavailable: () => isBackendUnavailable,
    useSession: () => ({ authenticated, setAuthenticated }),
  });

  function Harness() {
    const [event, setEvent] = useState<CompassEvent | null>(initialEvent);
    const handleSetEvent = useCallback<typeof setEvent>((nextEvent) => {
      setEventSpy(nextEvent);
      setEvent(nextEvent);
    }, []);

    if (!event) return null;

    return <RecurrenceSection event={event} setEvent={handleSetEvent} />;
  }

  const view = render(<Harness />);

  return { ...view, setEventSpy };
}

describe("RecurrenceSection", () => {
  it("keeps recurrence settings hidden for local users", async () => {
    const user = userEvent.setup();
    const { setEventSpy } = renderRecurrenceSection({ authenticated: false });

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
    expect(setEventSpy).not.toHaveBeenCalled();
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
    const { setEventSpy } = renderRecurrenceSection({
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
    expect(setEventSpy).not.toHaveBeenCalled();
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
      initialEvent: recurringEvent(),
    });

    // No click on the Repeat toggle - an event that already has a rule must
    // render its controls expanded from the first render.
    expect(screen.getByText("Every")).toBeInTheDocument();
    expect(screen.getByText("Ends on:")).toBeInTheDocument();

    const selected = [...container.querySelectorAll("[data-selected]")].map(
      (button) => button.getAttribute("data-selected"),
    );
    // WEEKDAYS order is [sun, mon, tue, wed, thu, fri, sat]; the stored rule
    // is BYDAY=MO,TU,WE.
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
