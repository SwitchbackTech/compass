import { useEffect, useMemo } from "react";
import dayjs, { type Dayjs } from "@core/util/date/dayjs";
import { computeSomedayEventsRequestFilter } from "@web/common/utils/datetime/web.date.util";
import { getSomedayEventsSlice } from "@web/ducks/events/slices/someday.slice";
import { updateDates } from "@web/ducks/events/slices/view.slice";
import { useAppDispatch } from "@web/store/store.hooks";

export function usePlannerSidebarSomedayEvents(viewStart: Dayjs) {
  const dispatch = useAppDispatch();
  const viewStartValue = viewStart.format();
  const viewEndValue = viewStart.endOf("week").format();
  const monthEndValue = viewStart.endOf("month").format();

  const somedayEventsRequestFilter = useMemo(() => {
    return computeSomedayEventsRequestFilter(
      dayjs(viewStartValue),
      dayjs(monthEndValue),
    );
  }, [monthEndValue, viewStartValue]);

  useEffect(() => {
    dispatch(
      updateDates({
        start: viewStartValue,
        end: viewEndValue,
      }),
    );

    dispatch(
      getSomedayEventsSlice.actions.request({
        ...somedayEventsRequestFilter,
      }),
    );
  }, [
    dispatch,
    somedayEventsRequestFilter,
    somedayEventsRequestFilter.endDate,
    somedayEventsRequestFilter.startDate,
    viewEndValue,
    viewStartValue,
  ]);
}
