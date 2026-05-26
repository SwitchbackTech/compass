import { useEffect, useRef, useState } from "react";
import { SOMEDAY_EVENT_ROW_FOOTPRINT } from "../SomedayEvent/styled";
import {
  getCachedSomedayCount,
  setCachedSomedayCount,
} from "./somedayCountCache";

const COLD_START_TIMEOUT_MS = 2000;
const SETTLED_EMPTY_RELEASE_DELAY_MS = 100;
const RESERVE_RELEASE_DELAY_MS = 600;

interface Result {
  reservedMinHeight: number | undefined;
  shouldAnimateRowEntrance: boolean;
}

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

    if (eventCount > 0) {
      shouldAnimateRowsRef.current = false;
      const timeout = window.setTimeout(() => {
        setCachedSomedayCount(cacheKey, eventCount);
        setIsColdStart(false);
      }, RESERVE_RELEASE_DELAY_MS);
      return () => window.clearTimeout(timeout);
    }

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

  return { reservedMinHeight, shouldAnimateRowEntrance };
};
