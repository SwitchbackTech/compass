import { HotkeyManager, HotkeysProvider } from "@tanstack/react-hotkeys";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { pressKey } from "@web/__tests__/utils/keyboard.test.util";
import { BillingBanner } from "@web/billing/BillingBanner";
import {
  POINTER_ACTION_ATTRIBUTE,
  POINTER_ACTIONS,
  POINTER_SHORTCUT_ATTRIBUTE,
} from "@web/shortcuts/keyboard-only/pointer-action";
import { START_TRIAL_SHORTCUT_KEY } from "@web/shortcuts/notice-focus/useNoticeActionShortcut";
import { eventJumpActions } from "@web/shortcuts/shift-hint/event-jump.store";
import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import "@testing-library/jest-dom";

afterEach(() => {
  cleanup();
  eventJumpActions.reset();
});

const renderBanner = (onCta = mock(), disabled = false) =>
  render(
    <HotkeysProvider>
      <BillingBanner
        ctaLabel="Start your free 7-day trial to save changes"
        disabled={disabled}
        message="You're looking around in read-only mode."
        onCta={onCta}
        pointerAction={POINTER_ACTIONS.startTrial}
        shortcutKey={START_TRIAL_SHORTCUT_KEY}
      />
    </HotkeysProvider>,
  );

describe("BillingBanner", () => {
  beforeEach(() => {
    HotkeyManager.resetInstance();
    document.body.removeAttribute("data-app-locked");
    eventJumpActions.reset();
  });

  it("shows an S keycap and starts the trial when S is pressed", () => {
    const onCta = mock();
    renderBanner(onCta);

    const button = screen.getByRole("button", {
      name: "Start your free 7-day trial to save changes",
    });
    expect(within(button).getByText("S")).toBeTruthy();
    expect(button).toHaveAttribute(
      POINTER_SHORTCUT_ATTRIBUTE,
      START_TRIAL_SHORTCUT_KEY,
    );
    expect(button).toHaveAttribute(
      POINTER_ACTION_ATTRIBUTE,
      POINTER_ACTIONS.startTrial,
    );

    pressKey("S");

    expect(onCta).toHaveBeenCalledTimes(1);
  });

  it("does not start the trial with S while disabled", () => {
    const onCta = mock();
    renderBanner(onCta, true);
    pressKey("S");
    expect(onCta).not.toHaveBeenCalled();
  });

  it("does not start the trial with S while event jump is active", () => {
    const onCta = mock();
    eventJumpActions.setActive(true);
    renderBanner(onCta);
    pressKey("S");
    expect(onCta).not.toHaveBeenCalled();
  });

  it("still runs the CTA from a click in tests", async () => {
    const onCta = mock();
    const user = userEvent.setup();
    renderBanner(onCta);

    await user.click(
      screen.getByRole("button", {
        name: "Start your free 7-day trial to save changes",
      }),
    );
    expect(onCta).toHaveBeenCalledTimes(1);
  });
});
