import { createTestNotificationPort } from "@web/__tests__/helpers/web-test-seams";
import { STORAGE_KEYS } from "@web/common/constants/storage.constants";
import { persistentBrowserStore } from "@web/common/storage/browser-key-value.store";
import {
  registerNotificationPort,
  resetNotificationPort,
} from "@web/notifications/notification.port";
import {
  dismissNotificationBlockedBanner,
  pickNotificationBlockedBannerKind,
} from "@web/notifications/notification-blocked-banner.util";
import {
  recordNotificationShowFailure,
  resetNotificationShowFailureCount,
} from "@web/notifications/notification-diagnostics";
import { afterEach, beforeEach, describe, expect, it } from "bun:test";

describe("pickNotificationBlockedBannerKind", () => {
  beforeEach(() => {
    persistentBrowserStore.remove(STORAGE_KEYS.NOTIFICATIONS_ENABLED);
    persistentBrowserStore.remove(
      STORAGE_KEYS.NOTIFICATIONS_BLOCKED_BANNER_DISMISSED,
    );
    resetNotificationShowFailureCount();
    if (typeof sessionStorage !== "undefined") sessionStorage.clear();
    resetNotificationPort();
  });

  afterEach(() => {
    resetNotificationPort();
  });

  it("returns null when notifications are not opted in", () => {
    registerNotificationPort(
      createTestNotificationPort({ permission: "granted" }).port,
    );

    expect(pickNotificationBlockedBannerKind()).toBeNull();
  });

  it("prompts for permission when the pref is on but the grant is missing", () => {
    persistentBrowserStore.set(STORAGE_KEYS.NOTIFICATIONS_ENABLED, "true");
    registerNotificationPort(
      createTestNotificationPort({ permission: "default" }).port,
    );

    expect(pickNotificationBlockedBannerKind()).toBe("permission");
  });

  it("warns when the browser keeps dropping constructed notifications", () => {
    persistentBrowserStore.set(STORAGE_KEYS.NOTIFICATIONS_ENABLED, "true");
    registerNotificationPort(
      createTestNotificationPort({ permission: "granted" }).port,
    );
    recordNotificationShowFailure();
    recordNotificationShowFailure();

    expect(pickNotificationBlockedBannerKind()).toBe("show_blocked");
  });

  it("stays hidden after dismiss", () => {
    persistentBrowserStore.set(STORAGE_KEYS.NOTIFICATIONS_ENABLED, "true");
    registerNotificationPort(
      createTestNotificationPort({ permission: "default" }).port,
    );
    dismissNotificationBlockedBanner();

    expect(pickNotificationBlockedBannerKind()).toBeNull();
  });
});
