import {
  isBookingDateKey,
  isBookingMonthKey,
} from "@web/booking/public-booking.format";
import { isValidTimeZone } from "@web/timezone/browser-timezone";

export interface PublicBookingSearch {
  month?: string;
  date?: string;
  slot?: string;
  tz?: string;
}

/**
 * Search params are the guest's shareable selection state (month in view,
 * picked day, picked slot, timezone override). Garbage never throws - an
 * invalid value drops to undefined and the page falls back to its defaults.
 */
export function validatePublicBookingSearch(
  search: Record<string, unknown>,
): PublicBookingSearch {
  const month =
    typeof search["month"] === "string" && isBookingMonthKey(search["month"])
      ? search["month"]
      : undefined;
  const date =
    typeof search["date"] === "string" && isBookingDateKey(search["date"])
      ? search["date"]
      : undefined;
  const slot =
    typeof search["slot"] === "string" &&
    !Number.isNaN(Date.parse(search["slot"]))
      ? search["slot"]
      : undefined;
  const tz =
    typeof search["tz"] === "string" && isValidTimeZone(search["tz"])
      ? search["tz"]
      : undefined;
  return { month, date, slot, tz };
}

/**
 * The cancel link's `?token=` must survive on its own route: previously it
 * lived only because the root route's auth-modal whitelist happened to share
 * the param name.
 */
export function validateBookingCancelSearch(search: Record<string, unknown>): {
  token?: string;
} {
  return {
    token:
      typeof search["token"] === "string" && search["token"].length > 0
        ? search["token"]
        : undefined,
  };
}
