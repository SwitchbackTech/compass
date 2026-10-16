import { sessionBrowserStore } from "@web/common/storage/browser-key-value.store";

const SHOW_FAILURE_SESSION_KEY = "compass.notifications.session-show-failures";

export function readNotificationShowFailureCount(): number {
  const parsed = Number.parseInt(
    sessionBrowserStore.get(SHOW_FAILURE_SESSION_KEY) ?? "",
    10,
  );
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

export function recordNotificationShowFailure(): number {
  const next = readNotificationShowFailureCount() + 1;
  sessionBrowserStore.set(SHOW_FAILURE_SESSION_KEY, String(next));
  return next;
}

export function resetNotificationShowFailureCount(): void {
  sessionBrowserStore.remove(SHOW_FAILURE_SESSION_KEY);
}
