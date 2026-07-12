import { useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useMemo, useRef } from "react";
import dayjs, { type Dayjs } from "@core/util/date/dayjs";
import { ROOT_ROUTES, ROUTE_IDS } from "@web/common/constants/routes";
import { toUTCOffset } from "@web/common/utils/datetime/web.date.util";
import { weekEventsQueryOptions } from "@web/events/queries/event.query.options";
import { usePrefetchAdjacentEvents } from "@web/events/queries/usePrefetchAdjacentEvents";
import { useSomedayEventsQuery } from "@web/events/queries/useSomedayEventsQuery";
import { useWeekEventsQuery } from "@web/events/queries/useWeekEventsQuery";
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
  const anchorDateString = params?.dateString ?? today.format(DATE_FORMAT);
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

  const week = useMemo(() => start.week(), [start]);

  const isCurrentWeek = today.isBetween(start, end, "day", "[]");

  const weekDays = useMemo(
    () =>
      Array.from({ length: visibleDayCount }, (_, index) =>
        start.add(index, "day"),
      ),
    [start, visibleDayCount],
  );

  // Changing the visible range re-keys the query; revisits use cached data.
  useWeekEventsQuery({ startOfView: start, endOfView: end });
  useSomedayEventsQuery(start);

  // Warm the previous and next visible pages using the exact read-key format.
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
        previousStart.add(visibleDayCount - 1, "day").endOf("day"),
      ),
    },
    {
      startDate: toUTCOffset(nextStart),
      endDate: toUTCOffset(
        nextStart.add(visibleDayCount - 1, "day").endOf("day"),
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
    navigationSourceRef.current = "manual";
    if (!isCurrentWeek) {
      setAnchor(today.startOf("week"));
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
