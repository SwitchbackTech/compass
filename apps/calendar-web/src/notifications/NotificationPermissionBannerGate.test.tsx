import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createTestNotificationPort } from "@web/__tests__/helpers/web-test-seams";
import { STORAGE_KEYS } from "@web/common/constants/storage.constants";
import { persistentBrowserStore } from "@web/common/storage/browser-key-value.store";
import { NotificationPermissionBannerGate } from "@web/notifications/NotificationPermissionBannerGate";
import {
  registerNotificationPort,
  resetNotificationPort,
} from "@web/notifications/notification.port";
import {
  recordNotificationShowFailure,
  resetNotificationShowFailureCount,
} from "@web/notifications/notification-diagnostics";
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import "@testing-library/jest-dom";

const banner = () =>
  screen.queryByRole("region", { name: "Event notifications blocked" });

describe("NotificationPermissionBannerGate", () => {
  beforeEach(() => {
    persistentBrowserStore.remove(STORAGE_KEYS.NOTIFICATIONS_ENABLED);
    persistentBrowserStore.remove(
      STORAGE_KEYS.NOTIFICATIONS_BLOCKED_BANNER_DISMISSED,
    );
    resetNotificationShowFailureCount();
    resetNotificationPort();
  });

  afterEach(() => {
    cleanup();
    resetNotificationPort();
    resetNotificationShowFailureCount();
    persistentBrowserStore.remove(STORAGE_KEYS.NOTIFICATIONS_ENABLED);
    persistentBrowserStore.remove(
      STORAGE_KEYS.NOTIFICATIONS_BLOCKED_BANNER_DISMISSED,
    );
  });

  it("stays hidden when notifications are not opted in", () => {
    registerNotificationPort(
      createTestNotificationPort({ permission: "granted" }).port,
    );

    render(<NotificationPermissionBannerGate />);

    expect(banner()).not.toBeInTheDocument();
  });

  it("prompts for permission when the pref is on but the grant is missing", () => {
    persistentBrowserStore.set(STORAGE_KEYS.NOTIFICATIONS_ENABLED, "true");
    registerNotificationPort(
      createTestNotificationPort({ permission: "default" }).port,
    );

    render(<NotificationPermissionBannerGate />);

    expect(banner()).toHaveTextContent("has not granted permission");
    expect(
      screen.getByRole("button", { name: "Allow notifications" }),
    ).toBeInTheDocument();
  });

  it("hides after dismiss and stays hidden on remount", async () => {
    const user = userEvent.setup();
    persistentBrowserStore.set(STORAGE_KEYS.NOTIFICATIONS_ENABLED, "true");
    registerNotificationPort(
      createTestNotificationPort({ permission: "default" }).port,
    );

    const { unmount } = render(<NotificationPermissionBannerGate />);
    await user.click(screen.getByRole("button", { name: "Dismiss" }));

    expect(banner()).not.toBeInTheDocument();
    unmount();

    render(<NotificationPermissionBannerGate />);
    expect(banner()).not.toBeInTheDocument();
  });

  it("warns when the browser keeps dropping constructed notifications", () => {
    persistentBrowserStore.set(STORAGE_KEYS.NOTIFICATIONS_ENABLED, "true");
    registerNotificationPort(
      createTestNotificationPort({ permission: "granted" }).port,
    );
    recordNotificationShowFailure();
    recordNotificationShowFailure();

    render(<NotificationPermissionBannerGate />);

    expect(banner()).toHaveTextContent("is not showing them");
    expect(
      screen.queryByRole("button", { name: "Allow notifications" }),
    ).not.toBeInTheDocument();
  });
});
