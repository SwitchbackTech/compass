import { notificationActions } from "@web/notifications/notification.state";
import { type NotificationBlockedBannerKind } from "@web/notifications/notification-blocked-banner.util";

export function NotificationPermissionBanner({
  kind,
  onDismiss,
}: {
  kind: NotificationBlockedBannerKind;
  onDismiss: () => void;
}) {
  const message =
    kind === "permission"
      ? "Allow browser notifications so Compass can alert you before events."
      : "Event notifications are on, but this browser is not showing them. Check Brave Shields, Focus or Do Not Disturb, and site notification settings for compasscalendar.com.";

  return (
    <section
      aria-label="Event notifications blocked"
      data-notice=""
      className="flex flex-wrap items-center justify-between gap-3 border-border border-b bg-surface-panel px-4 py-2 text-text-muted text-xs"
    >
      <p>{message}</p>
      <div className="flex shrink-0 gap-2">
        {kind === "permission" ? (
          <button
            className="c-focus-ring rounded-xs px-2 py-1 font-medium text-text hover:bg-surface-overlay"
            onClick={() => {
              void notificationActions.enable("palette");
            }}
            type="button"
          >
            Allow notifications
          </button>
        ) : null}
        <button
          className="c-focus-ring rounded-xs px-2 py-1 text-text hover:bg-surface-overlay"
          onClick={onDismiss}
          type="button"
        >
          Dismiss
        </button>
      </div>
    </section>
  );
}
