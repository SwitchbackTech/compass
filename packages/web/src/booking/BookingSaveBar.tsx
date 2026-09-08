import {
  bookingFieldAttrs,
  bookingJumpKeys,
} from "@web/booking/booking-sequence.fields";
import {
  OverlayPanelActionButton,
  OverlayPanelActions,
} from "@web/components/OverlayPanel/OverlayPanel";
import { ShortcutKeys } from "@web/components/Shortcuts/ShortcutKeys";
import { settingsShortcutAttrs } from "@web/settings/useSettingsShortcuts";

export const BOOKING_TURN_ON_LABEL = "Turn on meeting page";
export const BOOKING_SAVE_DRAFT_LABEL = "Save draft";
export const BOOKING_SAVE_CHANGES_LABEL = "Save changes";
export const BOOKING_TURN_OFF_LABEL = "Turn off meeting page";

export const BOOKING_SETTINGS_SAVE_BAR_CLASS_NAME =
  "sticky -bottom-8 z-10 border-border border-t bg-surface-panel pt-3 pb-8";

interface BookingSaveBarProps {
  error: string | null;
  isDirty: boolean;
  isLive: boolean;
  isPending: boolean;
  onSubmit: (enabled: boolean) => void;
  showShortcuts?: boolean;
}

export function BookingSaveBar({
  error,
  isDirty,
  isLive,
  isPending,
  onSubmit,
  showShortcuts = false,
}: BookingSaveBarProps) {
  const enabledChip = showShortcuts ? (
    <ShortcutKeys className="ml-2" keys={bookingJumpKeys("enabled")} />
  ) : null;
  const primaryLabel = isLive
    ? BOOKING_SAVE_CHANGES_LABEL
    : BOOKING_TURN_ON_LABEL;
  const pendingLabel = isPending ? "Saving…" : primaryLabel;

  return (
    <div className={BOOKING_SETTINGS_SAVE_BAR_CLASS_NAME}>
      {error ? (
        <p className="mb-2 font-medium text-sm text-text" role="alert">
          {error}
        </p>
      ) : null}
      {/* Default align=end keeps the always-on chip Save off the hours column. */}
      <OverlayPanelActions>
        {isLive ? (
          <OverlayPanelActionButton
            className="whitespace-nowrap"
            disabled={isPending}
            onClick={() => onSubmit(false)}
            variant="secondary"
            {...bookingFieldAttrs("enabled")}
          >
            {BOOKING_TURN_OFF_LABEL}
            {enabledChip}
          </OverlayPanelActionButton>
        ) : isDirty ? (
          <OverlayPanelActionButton
            className="whitespace-nowrap"
            disabled={isPending}
            onClick={() => onSubmit(false)}
            variant="secondary"
          >
            {BOOKING_SAVE_DRAFT_LABEL}
          </OverlayPanelActionButton>
        ) : null}
        <OverlayPanelActionButton
          aria-busy={isPending || undefined}
          aria-keyshortcuts="Meta+Enter Control+Enter"
          className="whitespace-nowrap"
          disabled={isPending}
          onClick={() => onSubmit(true)}
          shortcut={["Mod", "Enter"]}
          showShortcut
          variant="primary"
          {...settingsShortcutAttrs("save-booking")}
          {...(isLive ? {} : bookingFieldAttrs("enabled"))}
        >
          {pendingLabel}
          {isLive ? null : enabledChip}
        </OverlayPanelActionButton>
      </OverlayPanelActions>
    </div>
  );
}
