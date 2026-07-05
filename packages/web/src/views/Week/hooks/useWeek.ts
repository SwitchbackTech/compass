import { useEffect, useMemo, useRef, useState } from "react";
import { type Dayjs } from "@core/util/date/dayjs";
import { toUTCOffset } from "@web/common/utils/datetime/web.date.util";
import { weekEventsQueryOptions } from "@web/events/queries/event.query.options";
import { usePrefetchAdjacentEvents } from "@web/events/queries/usePrefetchAdjacentEvents";
import { useSomedayEventsQuery } from "@web/events/queries/useSomedayEventsQuery";
import { useWeekEventsQuery } from "@web/events/queries/useWeekEventsQuery";
import { viewActions } from "@web/events/stores/view.store";
import {
  anchorDateForWindowOffset,
  computeVisibleWindowOffset,
  WEEK_DAY_COUNT,
} from "@web/views/Week/util/week-window.util";
import { type Category_View } from "@web/views/Week/week-view.types";

export type WeekNavigationSource = "manual" | "drag-to-edge";

export const useWeek = (
  today: Dayjs,
  visibleDayCount: number = WEEK_DAY_COUNT,
) => {
  // The anchor is the day the visible window centers on. The week range and
  // the window offset both derive from it, so a day-count change re-windows
  // around the anchor without extra state.
  const [anchor, setAnchor] = useState(today);
  const navigationSourceRef = useRef<WeekNavigationSource>("manual");

  const start = useMemo(() => anchor.startOf("week"), [anchor]);
  const end = useMemo(() => start.endOf("week"), [start]);

  const week = useMemo(() => start.week(), [start]);

  const isCurrentWeek = today.week() === start.week();

  const windowOffset = computeVisibleWindowOffset({
    anchorIndex: anchor.startOf("day").diff(start.startOf("day"), "day"),
    visibleDayCount,
  });

  const weekDays = useMemo(
    () =>
      Array.from({ length: visibleDayCount }, (_, index) =>
        start.add(windowOffset + index, "day"),
      ),
    [start, visibleDayCount, windowOffset],
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
  const previousStart = useMemo(() => start.subtract(7, "day"), [start]);
  const nextStart = useMemo(() => start.add(7, "day"), [start]);
  usePrefetchAdjacentEvents(
    weekEventsQueryOptions,
    {
      startDate: toUTCOffset(previousStart),
      endDate: toUTCOffset(previousStart.endOf("week")),
    },
    {
      startDate: toUTCOffset(nextStart),
      endDate: toUTCOffset(nextStart.endOf("week")),
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

  // Shift the visible window by one page of visibleDayCount days; at the
  // week's edge, cross into the adjacent week entering from its near side.
  const pageWindow = (direction: 1 | -1, source: WeekNavigationSource) => {
    navigationSourceRef.current = source;
    const maxOffset = WEEK_DAY_COUNT - visibleDayCount;
    const isAtWeekEdge =
      direction === 1 ? windowOffset >= maxOffset : windowOffset <= 0;

    if (isAtWeekEdge) {
      setAnchor(
        anchorDateForWindowOffset({
          weekStart: start.add(direction * WEEK_DAY_COUNT, "day"),
          windowOffset: direction === 1 ? 0 : maxOffset,
          visibleDayCount,
        }),
      );
      return;
    }

    setAnchor(
      anchorDateForWindowOffset({
        weekStart: start,
        windowOffset: Math.min(
          Math.max(windowOffset + direction * visibleDayCount, 0),
          maxOffset,
        ),
        visibleDayCount,
      }),
    );
  };

  const incrementWeek = (source: WeekNavigationSource = "manual") =>
    pageWindow(1, source);

  const decrementWeek = (source: WeekNavigationSource = "manual") =>
    pageWindow(-1, source);

  const goToToday = () => {
    navigationSourceRef.current = "manual";
    if (!anchor.isSame(today, "day")) {
      setAnchor(today);
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
    util: { decrementWeek, goToToday, incrementWeek, getLastNavigationSource },
  };
  return weekProps;
};

export type WeekProps = ReturnType<typeof useWeek>;
