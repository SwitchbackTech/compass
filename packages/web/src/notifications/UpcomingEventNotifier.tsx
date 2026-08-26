import { useUpcomingEventNotifier } from "@web/notifications/useUpcomingEventNotifier";

/**
 * Renders nothing; exists so the notifier hook has a mount point in the app
 * shell alongside the other always-on hosts.
 */
export function UpcomingEventNotifier() {
  useUpcomingEventNotifier();
  return null;
}
