import { useState } from "react";
import {
  setPinnedTimeZone,
  useBrowserTimeZone,
  usePinnedTimeZone,
} from "@web/timezone/effective-timezone.store";
import { TimezoneMismatchBanner } from "@web/timezone/TimezoneMismatchBanner";
import {
  getTimezoneMismatchSnoozedBrowser,
  shouldShowTimezoneMismatch,
  snoozeTimezoneMismatch,
} from "@web/timezone/timezone-mismatch";

export function TimezoneMismatchBannerGate() {
  const pinnedTimeZone = usePinnedTimeZone();
  const browserTimeZone = useBrowserTimeZone();
  const [snoozedForBrowser, setSnoozedForBrowser] = useState(
    getTimezoneMismatchSnoozedBrowser,
  );

  if (pinnedTimeZone === null) {
    return null;
  }

  if (
    !shouldShowTimezoneMismatch(
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
        setSnoozedForBrowser(browserTimeZone);
      }}
      onSwitch={() => {
        setPinnedTimeZone(browserTimeZone);
      }}
    />
  );
}
