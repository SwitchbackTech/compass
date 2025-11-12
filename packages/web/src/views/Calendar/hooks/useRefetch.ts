import { useEffect, useMemo } from "react";
import { useLocation, useParams } from "react-router-dom";
import dayjs from "@core/util/date/dayjs";
import { ROOT_ROUTES } from "@web/common/constants/routes";
import {
  computeSomedayEventsRequestFilter,
  toUTCOffset,
} from "@web/common/utils/datetime/web.date.util";
import { Sync_AsyncStateContextReason } from "@web/ducks/events/context/sync.context";
import { selectImportLatestState } from "@web/ducks/events/selectors/sync.selector";
import { selectDatesInView } from "@web/ducks/events/selectors/view.selectors";
import { getDayEventsSlice } from "@web/ducks/events/slices/day.slice";
import { getSomedayEventsSlice } from "@web/ducks/events/slices/someday.slice";
import { resetIsFetchNeeded } from "@web/ducks/events/slices/sync.slice";
import { getWeekEventsSlice } from "@web/ducks/events/slices/week.slice";
import { useAppDispatch, useAppSelector } from "@web/store/store.hooks";
import { getValidDateFromUrl } from "@web/views/Day/util/date-route.util";

export const useRefetch = () => {
  const dispatch = useAppDispatch();
  const location = useLocation();
  const params = useParams<{ date?: string }>();
  const importState = useAppSelector(selectImportLatestState);
  const { isFetchNeeded, reason: _reason } = importState;
  const { start, end } = useAppSelector(selectDatesInView);

  // Detect if we're on day view
  const isDayView = useMemo(() => {
    const pathname = location.pathname;
    return (
      pathname === ROOT_ROUTES.DAY || pathname.startsWith(`${ROOT_ROUTES.DAY}/`)
    );
  }, [location.pathname]);

  // Get date range based on current view
  const dateRange = useMemo(() => {
    if (isDayView) {
      // For day view, get date from URL params
      const date = getValidDateFromUrl(params.date);
      return {
        start: date.startOf("day").format(),
        end: date.endOf("day").format(),
      };
    }
    // For week view, use dates from Redux state
    return { start, end };
  }, [isDayView, params.date, start, end]);

  useEffect(() => {
    if (isFetchNeeded) {
      if (
        _reason === Sync_AsyncStateContextReason.SOCKET_SOMEDAY_EVENT_CHANGED
      ) {
        const dateStart = dayjs(dateRange.start);
        const { startDate, endDate } = computeSomedayEventsRequestFilter(
          dateStart,
          dateStart.endOf("month"),
        );

        dispatch(
          getSomedayEventsSlice.actions.request({
            startDate,
            endDate,
            __context: { reason: _reason },
          }),
        );
      } else {
        const payload = {
          startDate: toUTCOffset(dateRange.start),
          endDate: toUTCOffset(dateRange.end),
          __context: { reason: _reason },
        };

        if (isDayView) {
          dispatch(getDayEventsSlice.actions.request(payload));
        } else {
          dispatch(getWeekEventsSlice.actions.request(payload));
        }
      }

      dispatch(resetIsFetchNeeded());
    }
  }, [
    dispatch,
    isFetchNeeded,
    dateRange.start,
    dateRange.end,
    _reason,
    isDayView,
  ]);
};
