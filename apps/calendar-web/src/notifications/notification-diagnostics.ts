import { track } from "@web/auth/posthog/track";
import { STORAGE_KEYS } from "@web/common/constants/storage.constants";
import { persistentBrowserStore } from "@web/common/storage/browser-key-value.store";
import { getNotificationPort } from "@web/notifications/notification.port";

const isNotificationsPrefEnabled = (): boolean =>
  persistentBrowserStore.get(STORAGE_KEYS.NOTIFICATIONS_ENABLED) === "true";

export type NotificationSkipReason =
  | "not_effective"
  | "no_reminders"
  | "already_fired"
  | "not_due"
  | "show_failed";

const SHOW_FAILURE_SESSION_KEY = "compass.notifications.session-show-failures";

export function readNotificationShowFailureCount(): number {
  if (typeof sessionStorage === "undefined") return 0;
  const raw = sessionStorage.getItem(SHOW_FAILURE_SESSION_KEY);
  const parsed = raw ? Number.parseInt(raw, 10) : 0;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

export function recordNotificationShowFailure(): number {
  if (typeof sessionStorage === "undefined") return 0;
  const next = readNotificationShowFailureCount() + 1;
  sessionStorage.setItem(SHOW_FAILURE_SESSION_KEY, String(next));
  return next;
}

export function resetNotificationShowFailureCount(): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.removeItem(SHOW_FAILURE_SESSION_KEY);
}

export function trackNotificationPermissionState(
  source: "palette" | "runtime",
): void {
  const port = getNotificationPort();
  track("notifications_permission", {
    source,
    pref_enabled: isNotificationsPrefEnabled(),
    permission: port.getPermission(),
    supported: port.isSupported(),
    effectively_on:
      isNotificationsPrefEnabled() && port.getPermission() === "granted",
  });
}

export function trackNotificationSkipped(
  reason: NotificationSkipReason,
  extra?: Record<string, number | string | boolean>,
): void {
  track("notifications_skipped", { reason, ...extra });
}

export function trackNotificationScheduled(reminderMinutes: number): void {
  track("notifications_scheduled", { reminder_minutes: reminderMinutes });
}
