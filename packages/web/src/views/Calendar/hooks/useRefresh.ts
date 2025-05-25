import { useEffect } from "react";
import { handleDispatchGetWeekEvents } from "@web/common/utils/event.util";
import { selectSyncState } from "@web/ducks/events/selectors/sync.selector";
import { selectDatesInView } from "@web/ducks/events/selectors/view.selectors";
import { resetIsFetchNeeded } from "@web/ducks/events/slices/sync.slice";
import { useAppDispatch, useAppSelector } from "@web/store/store.hooks";

export const useRefresh = () => {
  const dispatch = useAppDispatch();
  const { isFetchNeeded, reason } = useAppSelector(selectSyncState);
  const { start, end } = useAppSelector(selectDatesInView);

  useEffect(() => {
    if (isFetchNeeded) {
      dispatch(handleDispatchGetWeekEvents(start, end, reason));
      dispatch(resetIsFetchNeeded());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, end, isFetchNeeded, start]);
};
