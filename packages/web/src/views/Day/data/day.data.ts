import { useCallback, useEffect, useMemo, useState } from "react";
import { Schema_Event } from "@core/types/event.types";
import { Dayjs } from "@core/util/date/dayjs";
import { toUTCOffset } from "@web/common/utils/datetime/web.date.util";
import { EventApi } from "@web/ducks/events/event.api";
import { selectEventEntities } from "@web/ducks/events/selectors/event.selectors";
import { useAppSelector } from "@web/store/store.hooks";

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
 * Filters out events that have been deleted from Redux state
 */
export function useDayEvents(date: Dayjs): DayEvents {
  const [dayEvents, setDayEvents] = useState<DayEvents>({
    events: [],
    isLoading: true,
    error: null,
  });

  // Subscribe to Redux event entities to filter out deleted events
  const eventEntities = useAppSelector(selectEventEntities);

  const fetchDayEvents = useCallback(async () => {
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

      setDayEvents({ events, isLoading: false, error: null });
    } catch (error) {
      setDayEvents({
        events: [],
        isLoading: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }, [date]);

  useEffect(() => {
    fetchDayEvents();
  }, [fetchDayEvents]);

  // Filter out events that have been deleted from Redux state
  const filteredEvents = useMemo(() => {
    return dayEvents.events.filter(
      (event) => event._id && eventEntities[event._id],
    );
  }, [dayEvents.events, eventEntities]);

  return {
    ...dayEvents,
    events: filteredEvents,
  };
}
