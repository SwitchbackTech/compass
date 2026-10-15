import { useCallback, useSyncExternalStore } from "react";
import { STORAGE_KEYS } from "@web/common/constants/storage.constants";
import { subscribeToStorageKey } from "@web/common/utils/external-store.util";
import { NotificationPermissionBanner } from "@web/notifications/NotificationPermissionBanner";
import { getNotificationPort } from "@web/notifications/notification.port";
import {
  dismissNotificationBlockedBanner,
  pickNotificationBlockedBannerKind,
} from "@web/notifications/notification-blocked-banner.util";

const subscribe = (onChange: () => void) => {
  const unstorage = subscribeToStorageKey(
    STORAGE_KEYS.NOTIFICATIONS_ENABLED,
    onChange,
  );
  const unblocked = subscribeToStorageKey(
    STORAGE_KEYS.NOTIFICATIONS_BLOCKED_BANNER_DISMISSED,
    onChange,
  );
  const unobserve = getNotificationPort().observePermission(onChange);
  const onVisibilityChange = () => {
    if (document.visibilityState === "visible") onChange();
  };
  document.addEventListener("visibilitychange", onVisibilityChange);
  window.addEventListener("focus", onChange);
  window.addEventListener("storage", onChange);

  return () => {
    unstorage();
    unblocked();
    unobserve();
    document.removeEventListener("visibilitychange", onVisibilityChange);
    window.removeEventListener("focus", onChange);
    window.removeEventListener("storage", onChange);
  };
};

export function NotificationPermissionBannerGate() {
  const kind = useSyncExternalStore(
    subscribe,
    pickNotificationBlockedBannerKind,
    () => null,
  );

  const handleDismiss = useCallback(() => {
    dismissNotificationBlockedBanner();
  }, []);

  if (!kind) return null;

  return <NotificationPermissionBanner kind={kind} onDismiss={handleDismiss} />;
}
