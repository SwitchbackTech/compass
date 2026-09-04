import {
  isBookingDateKey,
  isBookingMonthKey,
} from "@web/booking/public-booking.keys";
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
 * Guest-action `?token=` on cancel and confirmation permalinks. Previously
 * it lived only because the root route's auth-modal whitelist happened to
 * share the param name.
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

export function tokenFromGuestActionUrl(url: string): string {
  try {
    return (
      new URL(url, "https://compasscalendar.com").searchParams.get("token") ??
      ""
    );
  } catch {
    return "";
  }
}

export function publicCancelUrlForReservation(
  reservationId: string,
  token: string,
  origin: string,
): string {
  const url = new URL(`/book/cancel/${reservationId}`, origin);
  url.searchParams.set("token", token);
  return url.toString();
}
