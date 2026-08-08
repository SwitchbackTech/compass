import { HotkeyManager } from "@tanstack/react-hotkeys";
import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useIsGridEventFocused } from "@web/grid/shortcuts/useIsGridEventFocused";
import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";

function Probe({
  getFocused,
}: {
  getFocused: () => { eventId: string; eventType: "timed" } | null;
}) {
  const eventFocused = useIsGridEventFocused(getFocused);
  return <div>{eventFocused ? "focused" : "idle"}</div>;
}

describe("useIsGridEventFocused", () => {
  beforeEach(() => {
    HotkeyManager.resetInstance();
  });

  afterEach(() => {
    cleanup();
    document.body.innerHTML = "";
  });

  it("updates when focus enters and leaves a grid event target", async () => {
    const user = userEvent.setup();
    const button = document.createElement("button");
    button.textContent = "Event";
    document.body.appendChild(button);

    const getFocused = mock(() =>
      document.activeElement === button
        ? { eventId: "a", eventType: "timed" as const }
        : null,
    );

    render(<Probe getFocused={getFocused} />);
    expect(screen.getByText("idle")).toBeTruthy();

    await act(async () => {
      await user.click(button);
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => resolve());
      });
    });
    expect(screen.getByText("focused")).toBeTruthy();

    await act(async () => {
      button.blur();
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => resolve());
      });
    });
    expect(screen.getByText("idle")).toBeTruthy();
  });
});
