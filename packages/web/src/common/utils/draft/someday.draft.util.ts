import { YEAR_MONTH_DAY_FORMAT } from "@core/constants/date.constants";
import { Categories_Event } from "@core/types/event.types";
import { type Dayjs } from "@core/util/date/dayjs";
import {
  type Activity_DraftEvent,
  draftActions,
} from "@web/events/stores/draft.store";
import { assembleDefaultEvent } from "../event/event.util";

/** @deprecated
 * `createSomedayDraft` should not be called outside `useSidebarActions.createSomedayDraft`
 * Consider removing
 */
export const createSomedayDraft = async (
  category: Categories_Event.SOMEDAY_WEEK | Categories_Event.SOMEDAY_MONTH,
  startOfView: Dayjs,
  endOfView: Dayjs,
  activity: Activity_DraftEvent,
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

  // NOT converted to GridEventDraft/createGridEventDraft: GridScheduleDraft
  // only models "timed" | "allDay" schedules, and editGridEventDraft
  // explicitly rejects "someday" schedules. See packet-03-phase-3c scoping
  // note.
  draftActions.start({
    activity,
    eventType: category,
    event,
  });
};
