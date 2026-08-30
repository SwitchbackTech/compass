import { useUpcomingEventNotifier } from "@web/notifications/useUpcomingEventNotifier";

/**
 * Renders nothing; exists so the notifier hook has a mount point on RootShell
 * and keeps firing on every route, including Life.
 */
export function UpcomingEventNotifier() {
  useUpcomingEventNotifier();
  return null;
}
