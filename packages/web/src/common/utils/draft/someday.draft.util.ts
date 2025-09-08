import { Dayjs } from "dayjs";
import { Dispatch } from "redux";
import { YEAR_MONTH_DAY_FORMAT } from "@core/constants/date.constants";
import { Categories_Event } from "@core/types/event.types";
import { draftSlice } from "@web/ducks/events/slices/draft.slice";
import { Activity_DraftEvent } from "@web/ducks/events/slices/draft.slice.types";
import { assembleDefaultEvent } from "../event.util";

/** @deprecated
 * `createSomedayDraft` should not be called outside `useSidebarActions.createSomedayDraft`
 * Consider removing
 */
export const createSomedayDraft = async (
  category: Categories_Event.SOMEDAY_WEEK | Categories_Event.SOMEDAY_MONTH,
  startOfView: Dayjs,
  endOfView: Dayjs,
  activity: Activity_DraftEvent,
  dispatch: Dispatch,
) => {
  let startDate: string;
  let endDate: string;

  if (category === Categories_Event.SOMEDAY_WEEK) {
    startDate = startOfView.format(YEAR_MONTH_DAY_FORMAT);
    endDate = endOfView.format(YEAR_MONTH_DAY_FORMAT);
  } else {
    // Someday month
    startDate = startOfView.startOf("month").format(YEAR_MONTH_DAY_FORMAT);
    // `endDate` is the last day of the month, hence why we need to use `startOfView`, because
    // `endOfView` could be in the next month relative to `startOfView`
    endDate = startOfView.endOf("month").format(YEAR_MONTH_DAY_FORMAT);
  }

  const event = await assembleDefaultEvent(category, startDate, endDate);

  dispatch(
    draftSlice.actions.start({
      activity,
      eventType: category,
      event,
    }),
  );
};
