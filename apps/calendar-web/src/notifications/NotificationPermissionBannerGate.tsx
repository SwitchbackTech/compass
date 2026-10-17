import { useSyncExternalStore } from "react";
import { NotificationPermissionBanner } from "@web/notifications/NotificationPermissionBanner";
import { subscribeToNotificationState } from "@web/notifications/notification.state";
import {
  dismissNotificationBlockedBanner,
  pickNotificationBlockedBannerKind,
} from "@web/notifications/notification-blocked-banner.util";

export function NotificationPermissionBannerGate() {
  const kind = useSyncExternalStore(
    subscribeToNotificationState,
    pickNotificationBlockedBannerKind,
    () => null,
  );

  if (!kind) return null;

  return (
    <NotificationPermissionBanner
      kind={kind}
      onDismiss={dismissNotificationBlockedBanner}
    />
  );
}
