import dayjs from "dayjs";
import { useEffect, useMemo } from "react";
import {
  computeSomedayEventsRequestFilter,
  toUTCOffset,
} from "@web/common/utils/web.date.util";
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
  const importState = useAppSelector(selectImportLatestState);
  const { isFetchNeeded, reason: _reason } = importState;
  const { start, end } = useAppSelector(selectDatesInView);

  const reason = useMemo(() => {
    if (_reason === Sync_AsyncStateContextReason.SOCKET_EVENT_CHANGED) {
      return Week_AsyncStateContextReason.WEEK_VIEW_CHANGE;
    }

    return _reason;
  }, [_reason]);

  useEffect(() => {
    if (isFetchNeeded) {
      switch (reason) {
        case Week_AsyncStateContextReason.WEEK_VIEW_CHANGE: {
          dispatch(
            getWeekEventsSlice.actions.request({
              startDate: toUTCOffset(start),
              endDate: toUTCOffset(end),
              __context: { reason: _reason },
            }),
          );
          break;
        }
        case Sync_AsyncStateContextReason.SOCKET_SOMEDAY_EVENT_CHANGED: {
          const { startDate, endDate } = computeSomedayEventsRequestFilter(
            dayjs(start),
            dayjs(end),
          );

          dispatch(
            getSomedayEventsSlice.actions.request({
              startDate,
              endDate,
              __context: { reason: _reason },
            }),
          );
          break;
        }
      }

      dispatch(resetIsFetchNeeded());
    }
  }, [dispatch, end, isFetchNeeded, start, _reason, reason]);
};
