import { useEffect } from "react";
import { toUTCOffset } from "@web/common/utils/web.date.util";
import { selectIsRefetchNeeded } from "@web/ducks/events/selectors/sync.selector";
import { selectDatesInView } from "@web/ducks/events/selectors/view.selectors";
import { resetIsFetchNeeded } from "@web/ducks/events/slices/sync.slice";
import { getWeekEventsSlice } from "@web/ducks/events/slices/week.slice";
import { useAppDispatch, useAppSelector } from "@web/store/store.hooks";

export const useRefresh = () => {
  const dispatch = useAppDispatch();
  const isRefreshNeeded = useAppSelector(selectIsRefetchNeeded);
  const { start, end } = useAppSelector(selectDatesInView);

  useEffect(() => {
    if (isRefreshNeeded) {
      console.log("refreshing...");
      dispatch(
        getWeekEventsSlice.actions.request({
          startDate: toUTCOffset(start),
          endDate: toUTCOffset(end),
        })
      );
      console.log("resetting after fetch..");
      dispatch(resetIsFetchNeeded());
    }
  }, [dispatch, end, isRefreshNeeded, start]);
};
