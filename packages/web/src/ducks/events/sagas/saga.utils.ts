import { put, select } from "@redux-saga/core/effects";

import { getWeekEventsSlice } from "../slices/week.slice";
import { Response_GetEventsSaga } from "../event.types";
import { selectPaginatedEventsBySectionType } from "../selectors/util.selectors";
import { getSomedayEventsSlice } from "../slices/someday.slice";

/*
 * gets data from state, categorized by time frame (week, month, future)
 */
function* getEverySectionEvents() {
  /*
  const currentMonthEvents: Response_GetEventsSaga = (yield select((state) =>
    selectPaginatedEventsBySectionType(state, "currentMonth")
  )) as Response_GetEventsSaga;
  */

  const somedayEvents: Response_GetEventsSaga = (yield select((state) =>
    selectPaginatedEventsBySectionType(state, "someday")
  )) as Response_GetEventsSaga;

  const weekEvents: Response_GetEventsSaga = (yield select((state) =>
    selectPaginatedEventsBySectionType(state, "week")
  )) as Response_GetEventsSaga;

  // yield put(getCurrentMonthEventsSlice.actions.request(currentMonthEvents));
  yield put(getSomedayEventsSlice.actions.request(somedayEvents));
  yield put(getWeekEventsSlice.actions.request(weekEvents));
}
