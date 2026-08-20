import { useMinuteTick } from "@web/common/hooks/useMinuteTick";
import { useEffectiveTimeZone } from "@web/timezone/effective-timezone.store";
import { formatTimeZoneAbbreviation } from "@web/timezone/format-timezone-abbreviation";

/**
 * Week/Day grid-corner control showing the effective timezone abbreviation.
 * A button from day one so Part III can reuse it as the time-travel trigger;
 * Part II will wire the click to the timezone picker.
 */
export const GridTimezoneLabel = () => {
  const timeZone = useEffectiveTimeZone();
  const now = useMinuteTick();
  const abbreviation = formatTimeZoneAbbreviation(timeZone, now.toDate());

  return (
    <button
      aria-label={`Calendar timezone: ${abbreviation}`}
      className="c-focus-ring min-h-6 w-full max-w-full truncate rounded-sm px-0.5 text-center text-[10px] text-text-muted leading-none hover:text-text"
      type="button"
    >
      {abbreviation}
    </button>
  );
};
