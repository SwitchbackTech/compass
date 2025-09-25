import dayjs from "dayjs";
import { createSelector } from "@reduxjs/toolkit";
import {
  SOMEDAY_MONTHLY_LIMIT,
  SOMEDAY_WEEKLY_LIMIT,
} from "@core/constants/core.constants";
import { COLUMN_MONTH, COLUMN_WEEK } from "@web/common/constants/web.constants";
import { isProcessing } from "@web/common/store/helpers";
import { categorizeSomedayEvents } from "@web/common/utils/someday.util";
import { RootState } from "@web/store";
import { Schema_SomedayEventsColumn } from "@web/views/Calendar/components/Sidebar/sidebar.types";
import { selectEventEntities } from "./event.selectors";
import { selectDatesInView } from "./view.selectors";

export const selectIsGetSomedayEventsProcessing = (state: RootState) =>
  isProcessing(state.events.getSomedayEvents);

const selectSomedayIds = (state: RootState) =>
  state.events.getSomedayEvents.value?.data || [];

export const selectSomedayEvents = createSelector(
  selectEventEntities,
  selectSomedayIds,
  (entities, somedayIds) => {
    const somedayEvents: Schema_SomedayEventsColumn["events"] = {};

    somedayIds.forEach((id) => {
      const event = entities[id];
      if (event) {
        somedayEvents[id] = event;
      }
    });
    return somedayEvents;
  },
);

export const selectCategorizedEvents = createSelector(
  [selectSomedayEvents, selectDatesInView],
  (somedayEvents, dates) => {
    return categorizeSomedayEvents(somedayEvents, {
      start: dayjs(dates.start),
      end: dayjs(dates.end),
    });
  },
);

export const selectIsAtWeeklyLimit = createSelector(
  selectCategorizedEvents,
  (somedayEvents) =>
    somedayEvents.columns[COLUMN_WEEK].eventIds.length >= SOMEDAY_WEEKLY_LIMIT,
);

export const selectIsAtMonthlyLimit = createSelector(
  selectCategorizedEvents,
  (somedayEvents) =>
    somedayEvents.columns[COLUMN_MONTH].eventIds.length >=
    SOMEDAY_MONTHLY_LIMIT,
);

export const selectSomedayWeekCount = createSelector(
  selectCategorizedEvents,
  (somedayEvents) => somedayEvents.columns[COLUMN_WEEK].eventIds.length,
);
