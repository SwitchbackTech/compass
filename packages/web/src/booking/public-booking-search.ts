const MONTH_KEY_PATTERN = /^\d{4}-\d{2}$/;
const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export interface PublicBookingSearch {
  month?: string;
  date?: string;
  slot?: string;
  tz?: string;
}

const isValidTimeZone = (timeZone: string): boolean => {
  try {
    new Intl.DateTimeFormat(undefined, { timeZone });
    return true;
  } catch {
    return false;
  }
};

/**
 * Search params are the guest's shareable selection state (month in view,
 * picked day, picked slot, timezone override). Garbage never throws - an
 * invalid value drops to undefined and the page falls back to its defaults.
 */
export function validatePublicBookingSearch(
  search: Record<string, unknown>,
): PublicBookingSearch {
  const month =
    typeof search["month"] === "string" &&
    MONTH_KEY_PATTERN.test(search["month"])
      ? search["month"]
      : undefined;
  const date =
    typeof search["date"] === "string" && DATE_KEY_PATTERN.test(search["date"])
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
