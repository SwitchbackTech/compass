const STORAGE_PREFIX = "compass.someday.count.";

/**
 * Remembers how many someday rows a column held last time, so the next cold
 * start can reserve roughly the right amount of vertical space and avoid the
 * empty-then-fill layout shift. Best-effort: storage failures fall back to 0.
 */
export const getCachedSomedayCount = (cacheKey: string): number => {
  try {
    const raw = window.localStorage.getItem(getStorageKey(cacheKey));
    const parsed = raw === null ? 0 : Number.parseInt(raw, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  } catch {
    return 0;
  }
};

export const setCachedSomedayCount = (
  cacheKey: string,
  count: number,
): void => {
  try {
    const key = getStorageKey(cacheKey);
    const nextCount = String(Math.max(0, count));

    if (window.localStorage.getItem(key) === nextCount) {
      return;
    }

    window.localStorage.setItem(key, nextCount);
  } catch {
    // Ignore storage failures (private mode, quota, unavailable).
  }
};

const getStorageKey = (cacheKey: string): string =>
  `${STORAGE_PREFIX}${cacheKey}`;
