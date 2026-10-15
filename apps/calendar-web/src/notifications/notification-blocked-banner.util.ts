import { STORAGE_KEYS } from "@web/common/constants/storage.constants";
import { persistentBrowserStore } from "@web/common/storage/browser-key-value.store";
import { getNotificationPort } from "@web/notifications/notification.port";
import { isNotificationsPrefEnabled } from "@web/notifications/notification.state";
import { readNotificationShowFailureCount } from "@web/notifications/notification-diagnostics";

const SHOW_FAILURE_BANNER_THRESHOLD = 2;

export type NotificationBlockedBannerKind = "permission" | "show_blocked";

export function hasDismissedNotificationBlockedBanner(): boolean {
  return (
    persistentBrowserStore.get(
      STORAGE_KEYS.NOTIFICATIONS_BLOCKED_BANNER_DISMISSED,
    ) === "true"
  );
}

export function dismissNotificationBlockedBanner(): void {
  persistentBrowserStore.set(
    STORAGE_KEYS.NOTIFICATIONS_BLOCKED_BANNER_DISMISSED,
    "true",
  );
}

export function pickNotificationBlockedBannerKind(): NotificationBlockedBannerKind | null {
  if (!isNotificationsPrefEnabled()) return null;
  if (hasDismissedNotificationBlockedBanner()) return null;

  const port = getNotificationPort();
  if (!port.isSupported()) return null;

  const permission = port.getPermission();
  if (permission !== "granted") {
    return "permission";
  }

  if (readNotificationShowFailureCount() >= SHOW_FAILURE_BANNER_THRESHOLD) {
    return "show_blocked";
  }

  return null;
}
