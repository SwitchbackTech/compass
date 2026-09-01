import { isEventJumpActive } from "@web/shortcuts/shift-hint/event-jump.store";
import { useAppShortcut } from "@web/shortcuts/useAppShortcut";
import { isEditSequenceArmed } from "@web/shortcuts/useEditSequenceShortcut";

/** Digit on action toasts while they are mounted. Standing banners must not
 * use digits: they collide with quick-time create (`1` = 1:00). */
export const NOTICE_PRIMARY_ACTION_KEY = "1" as const;

/** Start-trial banner CTA. Same letter as the billing gate overlay. */
export const START_TRIAL_SHORTCUT_KEY = "S" as const;

/** Google connection banner CTA (Reconnect / Retry / Refresh). `G` matches
 * Continue with Google on the welcome and auth overlays. */
export const CONNECTION_BANNER_SHORTCUT_KEY = "G" as const;

export type NoticeActionKey =
  | typeof NOTICE_PRIMARY_ACTION_KEY
  | typeof START_TRIAL_SHORTCUT_KEY
  | typeof CONNECTION_BANNER_SHORTCUT_KEY;

const canHandleNoticeAction = (event: KeyboardEvent) =>
  !event.isComposing &&
  !event.metaKey &&
  !event.ctrlKey &&
  !event.altKey &&
  !event.shiftKey &&
  !isEventJumpActive() &&
  !isEditSequenceArmed();

/**
 * Runs a mounted notice CTA (banner or toast) from a bare key. Yields to
 * typing, app-lock, event-jump, and an armed `e`… sequence — the same
 * stand-down as toast `1` and focus-notice `f`.
 */
export function useNoticeActionShortcut(
  key: NoticeActionKey | undefined,
  onClick: () => void,
  options: { enabled?: boolean } = {},
) {
  useAppShortcut(
    key ?? NOTICE_PRIMARY_ACTION_KEY,
    (event) => {
      if (!canHandleNoticeAction(event)) return;
      onClick();
    },
    {
      enabled: Boolean(key) && (options.enabled ?? true),
      ignoreInputs: true,
      preventDefault: true,
      stopPropagation: true,
    },
  );
}
