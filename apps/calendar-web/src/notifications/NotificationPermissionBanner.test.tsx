import { HotkeyManager, HotkeysProvider } from "@tanstack/react-hotkeys";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import "@testing-library/jest-dom";
import { pressKey } from "@web/__tests__/utils/keyboard.test.util";
import { NotificationPermissionBanner } from "@web/notifications/NotificationPermissionBanner";
import { notificationActions } from "@web/notifications/notification.state";
import { NOTIFICATION_PERMISSION_BANNER_SHORTCUT_KEY } from "@web/shortcuts/notice-focus/useNoticeActionShortcut";
import { eventJumpActions } from "@web/shortcuts/shift-hint/event-jump.store";

const realNotificationEnable = notificationActions.enable;

afterEach(() => {
  notificationActions.enable = realNotificationEnable;
  cleanup();
  eventJumpActions.reset();
});

const renderBanner = (
  kind: "permission" | "show_blocked",
  onDismiss = mock(),
) =>
  render(
    <HotkeysProvider>
      <NotificationPermissionBanner kind={kind} onDismiss={onDismiss} />
    </HotkeysProvider>,
  );

describe("NotificationPermissionBanner", () => {
  beforeEach(() => {
    HotkeyManager.resetInstance();
    document.body.removeAttribute("data-app-locked");
    eventJumpActions.reset();
  });

  it("shows permission copy and an Allow CTA with the shortcut keycap", () => {
    renderBanner("permission");

    expect(
      screen.getByRole("region", { name: "Event notifications blocked" }),
    ).toHaveTextContent(
      "Allow browser notifications so Compass can alert you before events.",
    );

    const button = screen.getByRole("button", { name: "Allow notifications" });
    expect(
      within(button).getByText(NOTIFICATION_PERMISSION_BANNER_SHORTCUT_KEY),
    ).toBeTruthy();
  });

  it("enables notifications when the Allow CTA is clicked", async () => {
    const enable = mock(() => Promise.resolve());
    notificationActions.enable = enable as typeof notificationActions.enable;
    const user = userEvent.setup();

    renderBanner("permission");

    await user.click(
      screen.getByRole("button", { name: "Allow notifications" }),
    );

    expect(enable).toHaveBeenCalledWith("palette");
  });

  it(`enables notifications when ${NOTIFICATION_PERMISSION_BANNER_SHORTCUT_KEY} is pressed`, () => {
    const enable = mock(() => Promise.resolve());
    notificationActions.enable = enable as typeof notificationActions.enable;

    renderBanner("permission");

    pressKey(NOTIFICATION_PERMISSION_BANNER_SHORTCUT_KEY);

    expect(enable).toHaveBeenCalledWith("palette");
  });

  it("does not enable notifications with the shortcut on the show_blocked kind", () => {
    const enable = mock(() => Promise.resolve());
    notificationActions.enable = enable as typeof notificationActions.enable;

    renderBanner("show_blocked");

    pressKey(NOTIFICATION_PERMISSION_BANNER_SHORTCUT_KEY);

    expect(enable).not.toHaveBeenCalled();
  });

  it("does not enable notifications while event jump is active", () => {
    const enable = mock(() => Promise.resolve());
    notificationActions.enable = enable as typeof notificationActions.enable;
    eventJumpActions.setActive(true);

    renderBanner("permission");

    pressKey(NOTIFICATION_PERMISSION_BANNER_SHORTCUT_KEY);

    expect(enable).not.toHaveBeenCalled();
  });

  it("dismisses from the Dismiss button", async () => {
    const onDismiss = mock();
    const user = userEvent.setup();

    renderBanner("permission", onDismiss);

    await user.click(screen.getByRole("button", { name: "Dismiss" }));

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
