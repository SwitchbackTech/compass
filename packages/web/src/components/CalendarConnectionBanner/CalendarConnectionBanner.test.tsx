import { HotkeyManager, HotkeysProvider } from "@tanstack/react-hotkeys";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import "@testing-library/jest-dom";
import { pressKey } from "@web/__tests__/utils/keyboard.test.util";
import {
  POINTER_ACTION_ATTRIBUTE,
  POINTER_ACTIONS,
  POINTER_SHORTCUT_ATTRIBUTE,
} from "@web/shortcuts/keyboard-only/pointer-action";
import { NOTICE_PRIMARY_ACTION_KEY } from "@web/shortcuts/notice-focus/useNoticeActionShortcut";
import { eventJumpActions } from "@web/shortcuts/shift-hint/event-jump.store";
import { CalendarConnectionBanner } from "./CalendarConnectionBanner";

afterEach(() => {
  cleanup();
  eventJumpActions.reset();
});

const renderBanner = (
  kind: "reconnect" | "importFailed" | "delayed",
  onAction = mock(),
) =>
  render(
    <HotkeysProvider>
      <CalendarConnectionBanner kind={kind} onAction={onAction} />
    </HotkeysProvider>,
  );

describe("CalendarConnectionBanner", () => {
  beforeEach(() => {
    HotkeyManager.resetInstance();
    document.body.removeAttribute("data-app-locked");
    eventJumpActions.reset();
  });

  it("shows a reconnect action for revoked access", async () => {
    const onAction = mock();
    const user = userEvent.setup();

    renderBanner("reconnect", onAction);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Google Calendar needs reconnecting.",
    );
    await user.click(screen.getByRole("button", { name: "Reconnect" }));
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it("shows a 1 keycap and reconnects when 1 is pressed", () => {
    const onAction = mock();
    renderBanner("reconnect", onAction);

    const button = screen.getByRole("button", { name: "Reconnect" });
    expect(within(button).getByText("1")).toBeTruthy();
    expect(button).toHaveAttribute(
      POINTER_SHORTCUT_ATTRIBUTE,
      NOTICE_PRIMARY_ACTION_KEY,
    );
    expect(button).toHaveAttribute(
      POINTER_ACTION_ATTRIBUTE,
      POINTER_ACTIONS.reconnectGoogle,
    );

    pressKey("1");

    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it("does not reconnect with 1 while event jump is active", () => {
    const onAction = mock();
    eventJumpActions.setActive(true);
    renderBanner("reconnect", onAction);

    pressKey("1");

    expect(onAction).not.toHaveBeenCalled();
  });

  it("shows retry when the first import failed", async () => {
    const onAction = mock();
    const user = userEvent.setup();

    renderBanner("importFailed", onAction);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Couldn't add your calendar.",
    );
    await user.click(screen.getByRole("button", { name: "Retry" }));
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it("shows refresh when calendar updates are delayed", async () => {
    const onAction = mock();
    const user = userEvent.setup();

    renderBanner("delayed", onAction);

    expect(screen.getByRole("status")).toHaveTextContent(
      "Calendar updates are delayed.",
    );
    await user.click(screen.getByRole("button", { name: "Refresh" }));
    expect(onAction).toHaveBeenCalledTimes(1);
  });
});
