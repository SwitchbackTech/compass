import { STORAGE_KEYS } from "@web/common/constants/storage.constants";
import { persistentBrowserStore } from "@web/common/storage/browser-key-value.store";
import { formatTimeZoneAbbreviation } from "@web/timezone/format-timezone-abbreviation";
import { timeZoneCityName } from "@web/timezone/timezone-catalog";

export function shouldShowTimezoneMismatch(
  pinnedTimeZone: string | null,
  browserTimeZone: string,
  snoozedForBrowser: string | null,
): boolean {
  return (
    pinnedTimeZone !== null &&
    pinnedTimeZone !== browserTimeZone &&
    snoozedForBrowser !== browserTimeZone
  );
}

export function getTimezoneMismatchSnoozedBrowser(): string | null {
  return persistentBrowserStore.get(
    STORAGE_KEYS.TIMEZONE_MISMATCH_SNOOZED_BROWSER,
  );
}

export function snoozeTimezoneMismatch(browserTimeZone: string): void {
  persistentBrowserStore.set(
    STORAGE_KEYS.TIMEZONE_MISMATCH_SNOOZED_BROWSER,
    browserTimeZone,
  );
}

export function timezoneMismatchCopy(
  browserZone: string,
  calendarZone: string,
  at: Date = new Date(),
): { keepLabel: string; message: string; switchLabel: string } {
  const browserCity = timeZoneCityName(browserZone);
  const calendarCity = timeZoneCityName(calendarZone);
  const browserAbbr = formatTimeZoneAbbreviation(browserZone, at);
  const calendarAbbr = formatTimeZoneAbbreviation(calendarZone, at);

  return {
    keepLabel: `Keep ${calendarAbbr}`,
    message: `Your device is in ${browserCity} time (${browserAbbr}) but your calendar is showing ${calendarCity} time (${calendarAbbr}).`,
    switchLabel: `Switch to ${browserAbbr}`,
  };
}
