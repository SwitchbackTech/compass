import { useEffect, useMemo } from "react";
import dayjs from "@core/util/date/dayjs";
import { toUTCOffset } from "@web/common/utils/datetime/web.date.util";
import { Day_AsyncStateContextReason } from "@web/ducks/events/context/day.context";
import { getDayEventsSlice } from "@web/ducks/events/slices/day.slice";
import { useAppDispatch } from "@web/store/store.hooks";

export function useDayEvents(dateInView: dayjs.Dayjs) {
  const dispatch = useAppDispatch();

  const { startDateUtc, endDateUtc } = useMemo(() => {
    return {
      startDateUtc: toUTCOffset(dateInView.startOf("day").utc(true)),
      endDateUtc: toUTCOffset(dateInView.endOf("day").utc(true)),
    };
  }, [dateInView]);

  useEffect(() => {
    dispatch(
      getDayEventsSlice.actions.request({
        startDate: startDateUtc,
        endDate: endDateUtc,
        __context: { reason: Day_AsyncStateContextReason.DAY_VIEW_CHANGE },
      }),
    );
  }, [dispatch, startDateUtc, endDateUtc]);
}
