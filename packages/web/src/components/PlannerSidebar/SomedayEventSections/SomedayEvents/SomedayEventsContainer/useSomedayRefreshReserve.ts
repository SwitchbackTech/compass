import { useEffect, useRef } from "react";
import { SOMEDAY_EVENT_ROW_FOOTPRINT } from "../SomedayEvent/styled";

interface Result {
  reservedMinHeight: number | undefined;
  shouldAnimateRowEntrance: boolean;
}

export const useSomedayRefreshReserve = (
  eventCount: number,
  isProcessing: boolean,
): Result => {
  const lastSettledCountRef = useRef(eventCount);
  const wasProcessingRef = useRef(isProcessing);

  const reservedMinHeight =
    isProcessing && eventCount === 0 && lastSettledCountRef.current > 0
      ? lastSettledCountRef.current * SOMEDAY_EVENT_ROW_FOOTPRINT
      : undefined;
  const shouldAnimateRowEntrance =
    !isProcessing && wasProcessingRef.current && eventCount > 0;

  useEffect(() => {
    if (!isProcessing) {
      lastSettledCountRef.current = eventCount;
    }

    wasProcessingRef.current = isProcessing;
  }, [eventCount, isProcessing]);

  return { reservedMinHeight, shouldAnimateRowEntrance };
};
