import { useEffect } from "react";
import { toUTCOffset } from "@web/common/utils/web.date.util";
import { Sync_AsyncStateContextReason } from "@web/ducks/events/context/sync.context";
import { Week_AsyncStateContextReason } from "@web/ducks/events/context/week.context";
import { selectSyncState } from "@web/ducks/events/selectors/sync.selector";
import { selectDatesInView } from "@web/ducks/events/selectors/view.selectors";
import { resetIsFetchNeeded } from "@web/ducks/events/slices/sync.slice";
import { getWeekEventsSlice } from "@web/ducks/events/slices/week.slice";
import { useAppDispatch, useAppSelector } from "@web/store/store.hooks";

export const useRefresh = () => {
  const dispatch = useAppDispatch();
  const { isFetchNeeded, reason } = useAppSelector(selectSyncState);
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
      dispatch(resetIsFetchNeeded());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, end, isFetchNeeded, start]);
};
