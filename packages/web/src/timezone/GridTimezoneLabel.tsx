import { useEffect } from "react";
import { useMinuteTick } from "@web/common/hooks/useMinuteTick";
import {
  refreshEffectiveTimeZoneFromBrowser,
  useEffectiveTimeZone,
} from "@web/timezone/effective-timezone.store";
import { formatTimeZoneAbbreviation } from "@web/timezone/format-timezone-abbreviation";
import { timezoneDialogActions } from "@web/timezone/timezone-dialog.store";

const BROWSER_ZONE_POLL_MS = 60_000;

/**
 * Week/Day grid-corner control showing the effective timezone abbreviation.
 * A button from day one so Part III can reuse it as the time-travel trigger;
 * until then it opens the timezone picker.
 */
export const GridTimezoneLabel = () => {
  const timeZone = useEffectiveTimeZone();
  const now = useMinuteTick();

  // There is no timezonechange event. Poll so Auto mode follows an OS change
  // without a tab blur. Do not refresh on mount — that would wipe a test pin
  // before Auto-gating can keep it. DST abbreviation flips still use `now`
  // from the minute tick.
  useEffect(() => {
    const id = setInterval(
      refreshEffectiveTimeZoneFromBrowser,
      BROWSER_ZONE_POLL_MS,
    );
    return () => clearInterval(id);
  }, []);

  const abbreviation = formatTimeZoneAbbreviation(timeZone, now.toDate());

  return (
    <button
      aria-label={`Calendar timezone: ${abbreviation}`}
      className="c-focus-ring min-h-6 w-full max-w-full truncate rounded-sm px-0.5 text-center text-[10px] text-text-muted leading-none hover:text-text"
      onClick={() => timezoneDialogActions.open()}
      type="button"
    >
      {abbreviation}
    </button>
  );
};
