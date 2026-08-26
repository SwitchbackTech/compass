import { useEffect, useRef } from "react";
import { STORAGE_KEYS } from "@web/common/constants/storage.constants";
import { subscribeToStorageKey } from "@web/common/utils/external-store.util";
import { useTodayTimedEvents } from "@web/components/Sidebar/UpNextCard/useUpNextEvent";
import { getNotificationPort } from "@web/notifications/notification.port";
import {
  notificationActions,
  selectNotificationsEffectivelyOn,
  useNotificationStore,
} from "@web/notifications/notification.store";
import {
  announceUpcomingEvents,
  toNotifiableEvents,
} from "@web/notifications/upcoming-notifier.logic";

/**
 * Fires a browser notification NOTIFY_LEAD_MINUTES before each timed event.
 *
 * Runs on the shared minute tick rather than a setTimeout chain: 60s
 * granularity is plenty for a 5-minute lead, and it stays correct across
 * sleep/wake, where pending timers do not. Background tabs throttle timers to
 * roughly one per minute, which is exactly this cadence.
 */
export function useUpcomingEventNotifier(): void {
  const effectivelyOn = useNotificationStore(selectNotificationsEffectivelyOn);
  const { now, allTimedEvents } = useTodayTimedEvents();
  const firedKeysRef = useRef<Set<string>>(new Set());

  // Permission can change outside the app (site settings, a revoked grant),
  // and nothing tells the page directly — so watch the permission and re-check
  // whenever the tab comes back to the foreground.
  useEffect(() => {
    const sync = () => notificationActions.syncPermission();
    const unobserve = getNotificationPort().observePermission(sync);
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") sync();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("focus", sync);
    // Turning notifications off in one tab has to stop them in every tab.
    const unsubscribePref = subscribeToStorageKey(
      STORAGE_KEYS.NOTIFICATIONS_ENABLED,
      notificationActions.syncPrefFromStorage,
    );

    return () => {
      unobserve();
      unsubscribePref();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("focus", sync);
    };
  }, []);

  useEffect(() => {
    if (!effectivelyOn) return;

    firedKeysRef.current = announceUpcomingEvents(
      getNotificationPort(),
      now,
      toNotifiableEvents(allTimedEvents),
      firedKeysRef.current,
    );
  }, [effectivelyOn, now, allTimedEvents]);
}
