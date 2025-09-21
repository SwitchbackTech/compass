import dayjs from "dayjs";
import { useEffect } from "react";
import { toUTCOffset } from "@web/common/utils/web.date.util";
import { Sync_AsyncStateContextReason } from "@web/ducks/events/context/sync.context";
import { Week_AsyncStateContextReason } from "@web/ducks/events/context/week.context";
import { selectImportLatestState } from "@web/ducks/events/selectors/sync.selector";
import { selectDatesInView } from "@web/ducks/events/selectors/view.selectors";
import { getSomedayEventsSlice } from "@web/ducks/events/slices/someday.slice";
import { resetIsFetchNeeded } from "@web/ducks/events/slices/sync.slice";
import { getWeekEventsSlice } from "@web/ducks/events/slices/week.slice";
import { useAppDispatch, useAppSelector } from "@web/store/store.hooks";

export const useRefresh = () => {
  const dispatch = useAppDispatch();
  const { isFetchNeeded, reason } = useAppSelector(selectImportLatestState);
  const { start, end } = useAppSelector(selectDatesInView);

  useEffect(() => {
    const getRefreshWeekEventsReason = () => {
      if (reason === Sync_AsyncStateContextReason.SOCKET_EVENT_CHANGED) {
        // Hardcode enum return value for consistency and readability.
        return Week_AsyncStateContextReason.SOCKET_EVENT_CHANGED;
      }

      return reason;
    };

    if (isFetchNeeded) {
      dispatch(
        getWeekEventsSlice.actions.request({
          startDate: toUTCOffset(start),
          endDate: toUTCOffset(end),
          __context: {
            reason: getRefreshWeekEventsReason(),
          },
        }),
      );

      const startDate = dayjs(start).startOf("month").format();
      const endDate = dayjs(end).endOf("month").format();
      dispatch(
        getSomedayEventsSlice.actions.request({
          startDate,
          endDate,
          __context: {
            reason: getRefreshWeekEventsReason(),
          },
        }),
      );
      console.log("getWeekEventsSlice.actions.request");
      dispatch(resetIsFetchNeeded());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, end, isFetchNeeded, start]);
};
