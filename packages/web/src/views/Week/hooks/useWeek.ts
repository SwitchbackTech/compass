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
  // The anchor is the day the visible window centers on. The week range and
  // the window offset both derive from it, so a day-count change re-windows
  // around the anchor without extra state. The anchor itself lives in the
  // URL (rather than useState) so a refresh restores the same week; it is
  // memoized on the date *string* because `today` is a fresh Dayjs every
  // render, and memoizing on the Dayjs instance would re-derive start/end
  // (and re-fire the updateDates effect below) on every render.
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

  // Week + someday reads are driven by TanStack Query: changing start/end
  // re-keys the queries (fetch on new ranges, instant render from cache on
  // revisits). Queries stay week-granular even when fewer days render, so
  // window paging within a week never refetches.
  useWeekEventsQuery({ startOfView: start, endOfView: end });
  useSomedayEventsQuery(start);

  // Warm the previous/next week so the next prev/next click resolves from
  // cache. Uses the same toUTCOffset formatting useWeekEventsQuery uses for
  // the current range, so the prefetched entries land under the exact keys a
  // subsequent read looks up.
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
