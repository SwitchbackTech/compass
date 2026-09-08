import { useRef, useState } from "react";
import { type TimeZone } from "@core/types/domain-primitives";
import { OverlayPanel } from "@web/components/OverlayPanel/OverlayPanel";
import { ShortcutKeys } from "@web/components/Shortcuts/ShortcutKeys";
import { formatTimeZoneAbbreviation } from "@web/timezone/format-timezone-abbreviation";
import { TimezoneCombobox } from "@web/timezone/TimezoneCombobox";
import { timeZoneCityName } from "@web/timezone/timezone-catalog";

interface BookingTimezoneFieldProps {
  timeZone: TimeZone;
  onChange: (timeZone: TimeZone) => void;
  disabled?: boolean;
  /** Jump keys to reveal beside the caption while hold-Mod hints are up. */
  shortcutKeys?: readonly string[];
}

/**
 * The meeting page's timezone, picked through the same searchable combobox as
 * time travel and the default-timezone dialog. It was a native <select> over
 * the whole IANA catalog: ~420 options in raw id order, where the browser's
 * type-ahead matches the rendered city text, so typing "America" or "US" found
 * nothing. Now it is one tab stop, and the trigger renders whatever zone is
 * stored - including a non-canonical alias, which had no <option> at all.
 */
export function BookingTimezoneField({
  timeZone,
  onChange,
  disabled = false,
  shortcutKeys,
}: BookingTimezoneFieldProps) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const label = `${timeZoneCityName(timeZone)} (${formatTimeZoneAbbreviation(timeZone)})`;

  return (
    <div>
      <p
        className="mb-1 flex items-center gap-1 text-sm text-text"
        id="booking-timezone-label"
      >
        Meeting timezone
        {shortcutKeys ? <ShortcutKeys keys={[...shortcutKeys]} /> : null}
      </p>
      <button
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={`Meeting timezone: ${label}`}
        className="c-focus-ring w-full rounded border border-border bg-surface-overlay px-2 py-1 text-left text-sm text-text hover:bg-surface-panel disabled:pointer-events-none disabled:opacity-60"
        disabled={disabled}
        id="booking-timezone"
        onClick={() => setIsOpen(true)}
        ref={triggerRef}
        type="button"
      >
        {label}
      </button>

      {isOpen ? (
        <OverlayPanel
          align="start"
          initialFocusRef={searchRef}
          onDismiss={() => setIsOpen(false)}
          restoreFocus={() => triggerRef.current?.focus()}
          title="Meeting timezone"
          variant="modal"
          widthClassName="w-[480px]"
        >
          <TimezoneCombobox
            inputRef={searchRef}
            onSelect={(nextTimeZone) => {
              if (nextTimeZone) onChange(nextTimeZone as TimeZone);
              setIsOpen(false);
            }}
            searchLabel="Search meeting timezones"
            value={timeZone}
          />
        </OverlayPanel>
      ) : null}
    </div>
  );
}
