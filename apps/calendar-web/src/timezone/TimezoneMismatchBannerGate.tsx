import {
  setPinnedTimeZone,
  useBrowserTimeZone,
  usePinnedTimeZone,
} from "@web/timezone/effective-timezone.store";
import { TimezoneMismatchBanner } from "@web/timezone/TimezoneMismatchBanner";
import {
  isTimezoneMismatchBannerActive,
  snoozeTimezoneMismatch,
  useTimezoneMismatchSnoozedBrowser,
} from "@web/timezone/timezone-mismatch";

export function TimezoneMismatchBannerGate() {
  const pinnedTimeZone = usePinnedTimeZone();
  const browserTimeZone = useBrowserTimeZone();
  const snoozedForBrowser = useTimezoneMismatchSnoozedBrowser();

  if (pinnedTimeZone === null) {
    return null;
  }

  if (
    !isTimezoneMismatchBannerActive(
      pinnedTimeZone,
      browserTimeZone,
      snoozedForBrowser,
    )
  ) {
    return null;
  }

  return (
    <TimezoneMismatchBanner
      browserZone={browserTimeZone}
      calendarZone={pinnedTimeZone}
      onKeep={() => {
        snoozeTimezoneMismatch(browserTimeZone);
      }}
      onSwitch={() => {
        setPinnedTimeZone(browserTimeZone);
      }}
    />
  );
}
