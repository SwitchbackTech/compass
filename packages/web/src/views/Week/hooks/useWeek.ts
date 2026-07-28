import { useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useMemo, useRef } from "react";
import dayjs, { type Dayjs } from "@core/util/date/dayjs";
import { ROOT_ROUTES, ROUTE_IDS } from "@web/common/constants/routes";
import { toUTCOffset } from "@web/common/utils/datetime/web.date.util";
import { weekEventsQueryOptions } from "@web/events/queries/event.query.options";
import { usePrefetchAdjacentEvents } from "@web/events/queries/usePrefetchAdjacentEvents";
import { useWeekEventsQueryStatus } from "@web/events/queries/useWeekEventsQuery";
import { viewActions } from "@web/events/stores/view.store";
import { WEEK_DAY_COUNT } from "@web/views/Week/util/week-window.util";
import { type Category_View } from "@web/views/Week/week-view.types";

export type WeekNavigationSource = "manual" | "drag-to-edge" | "day-shift";

const DATE_FORMAT = dayjs.DateFormat.YEAR_MONTH_DAY_FORMAT;

export const useWeek = (
  today: Dayjs,
  visibleDayCount: number = WEEK_DAY_COUNT,
) => {
  // The URL date is the first visible day, so custom windows survive refresh
  // and can cross calendar-week boundaries. Memoize from the date string
  // because `today` is a fresh Dayjs instance on every render.
  const navigate = useNavigate();
  const params = useParams({
    from: ROUTE_IDS.WEEK_DATE,
    shouldThrow: false,
  });
  // Bare /week has no dateString. Default to today when only one day is
  // visible, otherwise the week-aligned start. Once navigation writes a
  // dateString, that drives the anchor at every width.
  const defaultAnchorDate =
    visibleDayCount === 1 ? today : today.startOf("week");
  const anchorDateString =
    params?.dateString ?? defaultAnchorDate.format(DATE_FORMAT);
  const anchor = useMemo(
    () => dayjs(anchorDateString, DATE_FORMAT),
    [anchorDateString],
  );
  const setAnchor = (date: Dayjs) =>
    navigate({
      to: ROOT_ROUTES.WEEK_DATE,
      params: { dateString: date.format(DATE_FORMAT) },
    });
  const navigationSourceRef = useRef<WeekNavigationSource>("manual");

  const start = useMemo(() => anchor.startOf("day"), [anchor]);
  const end = useMemo(
    () => start.add(visibleDayCount - 1, "day").endOf("day"),
    [start, visibleDayCount],
  );
  // Fetch window is always WEEK_DAY_COUNT days from the anchor so resize-driven
  // column changes reuse the same cache entry; display still clips to weekDays.
  const queryEnd = useMemo(
    () => start.add(WEEK_DAY_COUNT - 1, "day").endOf("day"),
    [start],
  );

  const week = useMemo(() => start.week(), [start]);

  const isCurrentWeek = today.isBetween(start, end, "day", "[]");

  const weekDays = useMemo(
    () =>
      Array.from({ length: visibleDayCount }, (_, index) =>
        start.add(index, "day"),
      ),
    [start, visibleDayCount],
  );

  // Status-only: triggers the fetch and warms the cache entry that the
  // event-consuming siblings in this tree (Draft, MainGridEvents,
  // WeekInteractionCoordinator, ...) read via useWeekEventViewModel for the
  // same range - they own error reporting for this query key, the same way
  // Grid.tsx's own useWeekEventsQueryStatus call relies on them.
  useWeekEventsQueryStatus({ startOfView: start, endOfView: queryEnd });

  // Warm the previous and next paged windows (J/K) using 7-day read keys.
  const previousStart = useMemo(
    () => start.subtract(visibleDayCount, "day"),
    [start, visibleDayCount],
  );
  const nextStart = useMemo(
    () => start.add(visibleDayCount, "day"),
    [start, visibleDayCount],
  );
  usePrefetchAdjacentEvents(
    weekEventsQueryOptions,
    {
      startDate: toUTCOffset(previousStart),
      endDate: toUTCOffset(
        previousStart.add(WEEK_DAY_COUNT - 1, "day").endOf("day"),
      ),
    },
    {
      startDate: toUTCOffset(nextStart),
      endDate: toUTCOffset(
        nextStart.add(WEEK_DAY_COUNT - 1, "day").endOf("day"),
      ),
    },
  );

  useEffect(() => {
    viewActions.updateDates({
      start: start.format(),
      end: end.format(),
    });
  }, [end, start]);

  const goToDate = (date: Dayjs) => {
    navigationSourceRef.current = "manual";
    setAnchor(date);
  };

  const pageWindow = (direction: 1 | -1, source: WeekNavigationSource) => {
    navigationSourceRef.current = source;
    setAnchor(start.add(direction * visibleDayCount, "day"));
  };

  const incrementWeek = (source: WeekNavigationSource = "manual") =>
    pageWindow(1, source);

  const decrementWeek = (source: WeekNavigationSource = "manual") =>
    pageWindow(-1, source);

  const shiftViewByDay = (direction: 1 | -1) => {
    navigationSourceRef.current = "day-shift";
    setAnchor(start.add(direction, "day"));
  };

  const goToToday = () => {
    const navigationSource = navigationSourceRef.current;
    navigationSourceRef.current = "manual";
    if (!isCurrentWeek) {
      const todayWindowStart = today.startOf("week");
      const shiftedWindowOffset =
        navigationSource === "day-shift"
          ? start.diff(start.startOf("week"), "day")
          : 0;
      setAnchor(todayWindowStart.add(shiftedWindowOffset, "day"));
    }
  };

  const getLastNavigationSource = () => navigationSourceRef.current;

  const weekProps = {
    component: {
      category: (isCurrentWeek ? "current" : "pastFuture") as Category_View,
      endOfView: end,
      isCurrentWeek,
      startOfView: start,
      week,
      weekDays,
    },
    query: {
      endOfView: queryEnd,
      startOfView: start,
    },
    state: { goToDate },
    util: {
      decrementWeek,
      getLastNavigationSource,
      goToToday,
      incrementWeek,
      shiftViewByDay,
    },
  };
  return weekProps;
};

export type WeekProps = ReturnType<typeof useWeek>;
