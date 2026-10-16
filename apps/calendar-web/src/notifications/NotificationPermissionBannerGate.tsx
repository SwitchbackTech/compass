import { useState, useSyncExternalStore } from "react";
import { NotificationPermissionBanner } from "@web/notifications/NotificationPermissionBanner";
import { subscribeToNotificationState } from "@web/notifications/notification.state";
import {
  dismissNotificationBlockedBanner,
  hasDismissedNotificationBlockedBanner,
  pickNotificationBlockedBannerKind,
} from "@web/notifications/notification-blocked-banner.util";

export function NotificationPermissionBannerGate() {
  const kind = useSyncExternalStore(
    subscribeToNotificationState,
    pickNotificationBlockedBannerKind,
    () => null,
  );
  const [dismissed, setDismissed] = useState(
    hasDismissedNotificationBlockedBanner,
  );

  if (!kind || dismissed) return null;

  return (
    <NotificationPermissionBanner
      kind={kind}
      onDismiss={() => {
        dismissNotificationBlockedBanner();
        setDismissed(true);
      }}
    />
  );
}
