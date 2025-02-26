import { Dayjs } from "dayjs";
import { Dispatch } from "redux";
import { YEAR_MONTH_FORMAT } from "@core/constants/date.constants";
import { Categories_Event, Schema_Event } from "@core/types/event.types";
import { draftSlice } from "@web/ducks/events/slices/draft.slice";
import { Activity_DraftEvent } from "@web/ducks/events/slices/draft.slice.types";
import { assembleDefaultEvent } from "../event.util";

interface Params {
  category: Categories_Event.SOMEDAY_WEEK | Categories_Event.SOMEDAY_MONTH;
  startOfView: Dayjs;
  endOfView: Dayjs;
  activity: Activity_DraftEvent;
  dispatch: Dispatch;
}

export const createSomedayDraft = async ({
  category,
  startOfView,
  endOfView,
  activity,
  dispatch,
}: Params) => {
  const somedayDefault = await assembleDefaultEvent(category);

  const event: Schema_Event = {
    ...somedayDefault,
    startDate: startOfView.format(YEAR_MONTH_FORMAT),
    endDate: endOfView.format(YEAR_MONTH_FORMAT),
  };
  console.log(event);

  dispatch(
    draftSlice.actions.start({
      activity,
      eventType: category,
      event,
    }),
  );
};
