import { useCallback, useEffect, useState } from "react";
import { Schema_Event } from "@core/types/event.types";
import { Dayjs } from "@core/util/date/dayjs";
import { toUTCOffset } from "@web/common/utils/datetime/web.date.util";
import { EventApi } from "@web/ducks/events/event.api";

const FETCH_TIMEOUT_MS = 10000;

const createTimeoutPromise = (ms: number): Promise<never> => {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error("Request timeout")), ms);
  });
};

interface DayEvents {
  events: Schema_Event[];
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook to fetch events for a specific day
 * Handles loading states, timeouts, and error cases independently from Redux
 */
export function useDayEvents(date: Dayjs): DayEvents {
  const [dayEvents, setDayEvents] = useState<DayEvents>({
    events: [],
    isLoading: true,
    error: null,
  });

  const fetchDayEvents = useCallback(async () => {
    const startTime = Date.now();
    const _startDate = date.startOf("day");
    const startDate = toUTCOffset(_startDate);
    const _endDate = date.endOf("day");
    const endDate = toUTCOffset(_endDate);

    setDayEvents({ events: [], isLoading: true, error: null });

    try {
      // Race between API call and timeout
      const response = await Promise.race([
        EventApi.get({ startDate, endDate, someday: false }),
        createTimeoutPromise(FETCH_TIMEOUT_MS),
      ]);

      const events = response.data || [];
      const loadingTime = Date.now() - startTime;
      const dateRange = { startDate, endDate };
      const count = events.length;

      console.log("Day events:", {
        events,
        loadingTime,
        dateRange,
        count,
      });

      setDayEvents({ events, isLoading: false, error: null });
    } catch (error) {
      const loadingTime = Date.now() - startTime;
      const dateRange = { startDate, endDate };
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      console.log("Day events error:", {
        error: errorMessage,
        loadingTime,
        dateRange,
      });

      setDayEvents({
        events: [],
        isLoading: false,
        error: errorMessage,
      });
    }
  }, [date]);

  useEffect(() => {
    fetchDayEvents();
  }, [fetchDayEvents]);

  return dayEvents;
}
