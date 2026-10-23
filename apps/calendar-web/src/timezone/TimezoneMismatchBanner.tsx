import { ShortcutKeys } from "@web/components/Shortcuts/ShortcutKeys";
import {
  TIMEZONE_MISMATCH_KEEP_SHORTCUT_KEY,
  TIMEZONE_MISMATCH_SWITCH_SHORTCUT_KEY,
  useNoticeActionShortcut,
} from "@web/shortcuts/notice-focus/useNoticeActionShortcut";
import { timezoneMismatchCopy } from "@web/timezone/timezone-mismatch";

export function TimezoneMismatchBanner({
  browserZone,
  calendarZone,
  onKeep,
  onSwitch,
}: {
  browserZone: string;
  calendarZone: string;
  onKeep: () => void;
  onSwitch: () => void;
}) {
  const { keepLabel, message, switchLabel } = timezoneMismatchCopy(
    browserZone,
    calendarZone,
  );

  useNoticeActionShortcut(TIMEZONE_MISMATCH_SWITCH_SHORTCUT_KEY, onSwitch);
  useNoticeActionShortcut(TIMEZONE_MISMATCH_KEEP_SHORTCUT_KEY, onKeep);

  return (
    <section
      aria-label="Timezone mismatch"
      data-notice=""
      className="flex flex-wrap items-center justify-between gap-3 border-border border-b bg-surface-panel px-4 py-2 text-text-muted text-xs"
    >
      <p>{message}</p>
      <div className="flex shrink-0 gap-2">
        <button
          className="c-focus-ring inline-flex items-center gap-2 rounded-xs px-2 py-1 font-medium text-text hover:bg-surface-overlay"
          onClick={onSwitch}
          type="button"
        >
          {switchLabel}
          <ShortcutKeys keys={TIMEZONE_MISMATCH_SWITCH_SHORTCUT_KEY} />
        </button>
        <button
          className="c-focus-ring inline-flex items-center gap-2 rounded-xs px-2 py-1 text-text hover:bg-surface-overlay"
          onClick={onKeep}
          type="button"
        >
          {keepLabel}
          <ShortcutKeys keys={TIMEZONE_MISMATCH_KEEP_SHORTCUT_KEY} />
        </button>
      </div>
    </section>
  );
}
