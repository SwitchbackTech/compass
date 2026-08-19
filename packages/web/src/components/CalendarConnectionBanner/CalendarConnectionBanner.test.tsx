import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, mock } from "bun:test";
import "@testing-library/jest-dom";
import { CalendarConnectionBanner } from "./CalendarConnectionBanner";

afterEach(() => {
  cleanup();
});

describe("CalendarConnectionBanner", () => {
  it("shows a reconnect action for revoked access", async () => {
    const onAction = mock();
    const user = userEvent.setup();

    render(<CalendarConnectionBanner kind="reconnect" onAction={onAction} />);

    expect(screen.getByRole("status")).toHaveTextContent(
      "Google Calendar needs reconnecting.",
    );
    await user.click(screen.getByRole("button", { name: "Reconnect" }));
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it("shows retry when the first import failed", async () => {
    const onAction = mock();
    const user = userEvent.setup();

    render(
      <CalendarConnectionBanner kind="importFailed" onAction={onAction} />,
    );

    expect(screen.getByRole("status")).toHaveTextContent(
      "Couldn't add your calendar.",
    );
    await user.click(screen.getByRole("button", { name: "Retry" }));
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it("shows refresh when calendar updates are delayed", async () => {
    const onAction = mock();
    const user = userEvent.setup();

    render(<CalendarConnectionBanner kind="delayed" onAction={onAction} />);

    expect(screen.getByRole("status")).toHaveTextContent(
      "Calendar updates are delayed.",
    );
    await user.click(screen.getByRole("button", { name: "Refresh" }));
    expect(onAction).toHaveBeenCalledTimes(1);
  });
});
