import { useEffect, useMemo, useRef, useState } from "react";
import { type Dayjs } from "@core/util/date/dayjs";
import { toUTCOffset } from "@web/common/utils/datetime/web.date.util";
import { weekEventsQueryOptions } from "@web/ducks/events/queries/event.query.options";
import { usePrefetchAdjacentEvents } from "@web/ducks/events/queries/usePrefetchAdjacentEvents";
import { useSomedayEventsQuery } from "@web/ducks/events/queries/useSomedayEventsQuery";
import { useWeekEventsQuery } from "@web/ducks/events/queries/useWeekEventsQuery";
import { updateDates } from "@web/ducks/events/slices/view.slice";
import { useAppDispatch } from "@web/store/store.hooks";
import { type Category_View } from "@web/views/Week/week-view.types";

export type WeekNavigationSource = "manual" | "drag-to-edge";

export const useWeek = (today: Dayjs) => {
  const dispatch = useAppDispatch();

  const origStart = useMemo(() => today.startOf("week"), [today]);
  const [start, setStartOfView] = useState(origStart);
  const navigationSourceRef = useRef<WeekNavigationSource>("manual");
  const end = useMemo(() => start.endOf("week"), [start]);

  const week = useMemo(() => start.week(), [start]);

  const isCurrentWeek = today.week() === start.week();

  const weekDays = [...(new Array(7) as number[])].map((_, index) => {
    return start.add(index, "day");
  });

  // Week + someday reads are driven by TanStack Query: changing start/end
  // re-keys the queries (fetch on new ranges, instant render from cache on
  // revisits). Redux stays the render source of truth via the hooks' sync.
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
    dispatch(
      updateDates({
        start: start.format(),
        end: end.format(),
      }),
    );
  }, [dispatch, end, start]);

  const decrementWeek = (source: WeekNavigationSource = "manual") => {
    navigationSourceRef.current = source;
    setStartOfView(start.subtract(7, "day"));
  };

  const goToToday = () => {
    navigationSourceRef.current = "manual";
    if (today.week() !== start.week()) {
      setStartOfView(today.startOf("week"));
    }
  };

  const incrementWeek = (source: WeekNavigationSource = "manual") => {
    navigationSourceRef.current = source;
    setStartOfView(start.add(7, "day"));
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
    state: { setStartOfView },
    util: { decrementWeek, goToToday, incrementWeek, getLastNavigationSource },
  };
  return weekProps;
};

export type WeekProps = ReturnType<typeof useWeek>;
