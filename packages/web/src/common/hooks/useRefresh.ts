import { Dayjs } from "dayjs";
import { selectSyncState } from "@web/ducks/events/selectors/sync.selector";
import { resetEventChanged } from "@web/ducks/events/slices/sync.slice";
import { getWeekEventsSlice } from "@web/ducks/events/slices/week.slice";
import { useAppDispatch, useAppSelector } from "@web/store/store.hooks";
import { useEffect, useState } from "react";

import { isEventInRange } from "../utils/event.util";

export const useRefresh = (startOfView: Dayjs, endOfView: Dayjs) => {
  const dispatch = useAppDispatch();
  const { updatedEvent } = useAppSelector(selectSyncState);
  const [isRefreshNeeded, setIsRefreshNeeded] = useState(false);

  useEffect(() => {
    console.log("useRefresh effect");
    if (updatedEvent) {
      const event = {
        start: updatedEvent.startDate,
        end: updatedEvent.endDate,
      };
      const range = {
        start: startOfView.format(),
        end: endOfView.format(),
      };
      const eventInViewChanged = isEventInRange(event, range);
      console.log("refresh needed?", eventInViewChanged);
      setIsRefreshNeeded(eventInViewChanged);
    }
  }, [updatedEvent, dispatch, startOfView, endOfView]);

  const onRefresh = () => {
    console.log("fetching latest ...");
    setTimeout(() => {
      console.log("Events refetched");
      dispatch(resetEventChanged());

      dispatch(
        getWeekEventsSlice.actions.request({
          startDate: startOfView.format(),
          endDate: endOfView.format(),
        })
      );

      setIsRefreshNeeded(false);
    }, 2000);
  };

  return { isRefreshNeeded, onRefresh };
};
