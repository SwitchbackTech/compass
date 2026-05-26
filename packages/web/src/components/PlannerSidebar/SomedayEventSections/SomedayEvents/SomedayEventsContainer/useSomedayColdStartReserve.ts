import { useEffect, useRef, useState } from "react";
import { SOMEDAY_EVENT_ROW_FOOTPRINT } from "../SomedayEvent/styled";
import {
  getCachedSomedayCount,
  setCachedSomedayCount,
} from "./somedayCountCache";

// Safety valve: never hold the reserve open longer than this if the first fetch
// never reports completion (e.g. served entirely from cache with no request).
const COLD_START_TIMEOUT_MS = 2000;
export const SOMEDAY_COLD_FADE_DURATION_MS = 600;
const SETTLED_EMPTY_RELEASE_DELAY_MS = 100;

// Hold the reserve one fade-length past the first paint that has rows, so they
// settle into the reserved space before it is released. Keep >= the
// --animate-someday-cold-fade-in duration in index.css.
const RESERVE_RELEASE_DELAY_MS = SOMEDAY_COLD_FADE_DURATION_MS;

interface Result {
  /** True only during the initial (cold-start) load, before the reserve is released. */
  isColdStart: boolean;
  /** Height to reserve while the cold-start reserve is held, else undefined. */
  reservedMinHeight: number | undefined;
  /** True for the first cold-start row render, so rows can capture it at mount. */
  shouldAnimateRowEntrance: boolean;
}

/**
 * Smooths the cold-start layout shift in a someday column: reserves space sized
 * from the last-known row count and holds it through the first paint that has
 * rows (and its fade-in), releasing only afterwards. This keeps the rows and
 * everything below them from jumping when the reserve resolves into content.
 * Only applies to the initial load — week/month navigation is an instant swap.
 */
export const useSomedayColdStartReserve = (
  cacheKey: string,
  eventCount: number,
  isProcessing: boolean,
): Result => {
  const [reservedCount] = useState(() => getCachedSomedayCount(cacheKey));
  const hasStartedRef = useRef(false);
  const shouldAnimateRowsRef = useRef(true);
  const [isColdStart, setIsColdStart] = useState(true);

  if (isProcessing) {
    hasStartedRef.current = true;
  }

  useEffect(() => {
    if (!isColdStart) {
      return;
    }

    // Rows are present: keep the reserve through this paint and the fade, then
    // release it so the (possibly empty) trailing space collapses after the
    // rows have settled rather than as they appear.
    if (eventCount > 0) {
      shouldAnimateRowsRef.current = false;
      const timeout = window.setTimeout(() => {
        setCachedSomedayCount(cacheKey, eventCount);
        setIsColdStart(false);
      }, RESERVE_RELEASE_DELAY_MS);
      return () => window.clearTimeout(timeout);
    }

    // Settled empty (the first fetch completed with no events): release after
    // one short grace period, so a success action and entity update that land in
    // separate renders do not accidentally disable the real first-row fade.
    const settledEmpty = hasStartedRef.current && !isProcessing;
    if (settledEmpty) {
      const timeout = window.setTimeout(() => {
        shouldAnimateRowsRef.current = false;
        setCachedSomedayCount(cacheKey, 0);
        setIsColdStart(false);
      }, SETTLED_EMPTY_RELEASE_DELAY_MS);
      return () => window.clearTimeout(timeout);
    }
  }, [cacheKey, eventCount, isColdStart, isProcessing]);

  // After cold start, keep the cached count fresh so add/remove before the next
  // reload doesn't leave a stale reserve.
  useEffect(() => {
    if (isColdStart || isProcessing) {
      return;
    }

    setCachedSomedayCount(cacheKey, eventCount);
  }, [cacheKey, eventCount, isColdStart, isProcessing]);

  useEffect(() => {
    if (!isColdStart) {
      return;
    }

    const timeout = window.setTimeout(() => {
      shouldAnimateRowsRef.current = false;
      setIsColdStart(false);
    }, COLD_START_TIMEOUT_MS);
    return () => window.clearTimeout(timeout);
  }, [isColdStart]);

  const reservedMinHeight =
    isColdStart && reservedCount > 0
      ? reservedCount * SOMEDAY_EVENT_ROW_FOOTPRINT
      : undefined;
  const shouldAnimateRowEntrance =
    isColdStart && shouldAnimateRowsRef.current && eventCount > 0;

  return { isColdStart, reservedMinHeight, shouldAnimateRowEntrance };
};
