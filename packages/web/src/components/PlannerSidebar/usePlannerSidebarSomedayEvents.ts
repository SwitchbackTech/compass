import { useEffect } from "react";
import dayjs, { type Dayjs } from "@core/util/date/dayjs";
import { computeSomedayEventsRequestFilter } from "@web/common/utils/datetime/web.date.util";
import { getSomedayEventsSlice } from "@web/ducks/events/slices/someday.slice";
import { updateDates } from "@web/ducks/events/slices/view.slice";
import { useAppDispatch } from "@web/store/store.hooks";

export function usePlannerSidebarSomedayEvents(
  viewStart: Dayjs,
  { isEnabled = true }: { isEnabled?: boolean } = {},
) {
  const dispatch = useAppDispatch();
  const viewStartValue = viewStart.format();
  const viewEndValue = viewStart.endOf("week").format();
  const monthEndValue = viewStart.endOf("month").format();

  useEffect(() => {
    if (!isEnabled) return;

    const somedayEventsRequestFilter = computeSomedayEventsRequestFilter(
      dayjs(viewStartValue),
      dayjs(monthEndValue),
    );

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
  }, [dispatch, isEnabled, monthEndValue, viewEndValue, viewStartValue]);
}
