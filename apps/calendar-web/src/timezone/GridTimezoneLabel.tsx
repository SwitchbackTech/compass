import { useEffect } from "react";
import { useMinuteTick } from "@web/common/hooks/useMinuteTick";
import {
  refreshEffectiveTimeZoneFromBrowser,
  useEffectiveTimeZone,
} from "@web/timezone/effective-timezone.store";
import { formatTimeZoneAbbreviation } from "@web/timezone/format-timezone-abbreviation";
import { GridTimezoneAbbrevButton } from "@web/timezone/GridTimezoneAbbrevButton";
import { SecondaryTimezoneExitHint } from "@web/timezone/SecondaryTimezoneExitHint";
import { useTimeTravelZone } from "@web/timezone/time-travel.store";
import { timezoneDialogActions } from "@web/timezone/timezone-dialog.store";

const BROWSER_ZONE_POLL_MS = 60_000;

/**
 * Week/Day grid-corner control showing the effective timezone abbreviation.
 * A blocked click teaches `z`; Enter/Space still opens the second-timezone picker.
 */
export const GridTimezoneLabel = () => {
  const timeZone = useEffectiveTimeZone();
  const timeTravelZone = useTimeTravelZone();
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

  const clock = now.toDate();
  const openTimeTravel = () => timezoneDialogActions.open("time-travel");
  const isTraveling = timeTravelZone !== null;

  return (
    // biome-ignore lint/a11y/useAriaPropsSupportedByRole: role="group" is set under the same isTraveling condition as the label
    <div
      aria-label={isTraveling ? "Primary and second timezone" : undefined}
      className={
        isTraveling ? "flex w-full min-w-0 items-end" : "w-full max-w-full"
      }
      role={isTraveling ? "group" : undefined}
    >
      {timeTravelZone !== null ? (
        <SecondaryTimezoneExitHint key={timeTravelZone}>
          <GridTimezoneAbbrevButton
            abbreviation={formatTimeZoneAbbreviation(timeTravelZone, clock)}
            label="Second timezone"
            onClick={openTimeTravel}
            shareColumn
          />
        </SecondaryTimezoneExitHint>
      ) : null}
      <GridTimezoneAbbrevButton
        abbreviation={formatTimeZoneAbbreviation(timeZone, clock)}
        label="Calendar timezone"
        onClick={openTimeTravel}
        shareColumn={isTraveling}
      />
    </div>
  );
};
