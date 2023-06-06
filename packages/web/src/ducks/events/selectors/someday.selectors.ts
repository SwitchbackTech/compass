import dayjs from "dayjs";
import { createSelector } from "reselect";
import {
  SOMEDAY_MONTHLY_LIMIT,
  SOMEDAY_WEEKLY_LIMIT,
} from "@core/constants/core.constants";
import { COLUMN_MONTH, COLUMN_WEEK } from "@web/common/constants/web.constants";
import { isProcessing } from "@web/common/store/helpers";
import { Schema_SomedayEventsColumn } from "@web/common/types/web.event.types";
import { RootState } from "@web/store";
import { selectDatesInView } from "@web/ducks/settings/selectors/settings.selectors";

import { selectEventEntities } from "./event.selectors";

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
  }
);

export const selectSomedayEventsCount = (state: RootState): number => {
  return state.events.getSomedayEvents.value?.data?.length || 0;
};

export const selectCategorizedEvents = createSelector(
  [selectSomedayEvents, selectDatesInView],
  (somedayEvents, dates) => {
    const start = dayjs(dates.start);
    const end = dayjs(dates.end);
    const sortedEvents = Object.values(somedayEvents).sort(
      (a, b) => a.order - b.order
    );
    const weekIds = [];
    const monthIds = [];

    sortedEvents.forEach((e) => {
      const eventStart = dayjs(e.startDate);
      const isWeek = eventStart.isBetween(start, end, null, "[]");
      if (isWeek) {
        weekIds.push(e._id);
        return;
      }

      const monthStartDate = start.startOf("month");
      const monthEndDate = start.endOf("month");
      const isMonthButNotWeek =
        !isWeek &&
        eventStart.isBetween(monthStartDate, monthEndDate, null, "[]");

      if (isMonthButNotWeek) {
        monthIds.push(e._id);
      }
    });

    const sortedData = {
      columns: {
        [COLUMN_WEEK]: {
          id: `${COLUMN_WEEK}`,
          eventIds: weekIds,
        },
        [COLUMN_MONTH]: {
          id: `${COLUMN_MONTH}`,
          eventIds: monthIds,
        },
      },
      columnOrder: [COLUMN_WEEK, COLUMN_MONTH],
      events: somedayEvents,
    };
    return sortedData;
  }
);

export const selectIsAtWeeklyLimit = createSelector(
  selectCategorizedEvents,
  (somedayEvents) =>
    somedayEvents.columns[COLUMN_WEEK].eventIds.length >= SOMEDAY_WEEKLY_LIMIT
);

export const selectIsAtMonthlyLimit = createSelector(
  selectCategorizedEvents,
  (somedayEvents) =>
    somedayEvents.columns[COLUMN_MONTH].eventIds.length >= SOMEDAY_MONTHLY_LIMIT
);

//++
export const _selectIsAtWeeklyLimit = (state: RootState) => {
  const somedayIds = state.events.getSomedayEvents.value?.data || [];
  console.log(somedayIds);
  return somedayIds.length >= SOMEDAY_WEEKLY_LIMIT;
};
