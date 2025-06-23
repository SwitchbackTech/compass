import { Dayjs } from "dayjs";
import { Dispatch } from "redux";
import { YEAR_MONTH_DAY_FORMAT } from "@core/constants/date.constants";
import { Categories_Event } from "@core/types/event.types";
import { draftSlice } from "@web/ducks/events/slices/draft.slice";
import { Activity_DraftEvent } from "@web/ducks/events/slices/draft.slice.types";
import { assembleDefaultEvent } from "../event.util";

export const createSomedayDraft = async (
  category: Categories_Event.SOMEDAY_WEEK | Categories_Event.SOMEDAY_MONTH,
  startOfView: Dayjs,
  endOfView: Dayjs,
  activity: Activity_DraftEvent,
  dispatch: Dispatch,
) => {
  const startDate = startOfView.format(YEAR_MONTH_DAY_FORMAT);
  const endDate = endOfView.format(YEAR_MONTH_DAY_FORMAT);

  const event = await assembleDefaultEvent(category, startDate, endDate);

  dispatch(
    draftSlice.actions.start({
      activity,
      eventType: category,
      event,
    }),
  );
};
