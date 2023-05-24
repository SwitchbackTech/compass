import { createSelector } from "reselect";
import { SOMEDAY_WEEKLY_LIMIT } from "@core/constants/core.constants";
import { COLUMN_MONTH, COLUMN_WEEK } from "@web/common/constants/web.constants";
import { isProcessing } from "@web/common/store/helpers";
import { Schema_SomedayEventsColumn } from "@web/common/types/web.event.types";
import { RootState } from "@web/store";

import { selectEventEntities } from "./event.selectors";

export const selectIsAtMonthlyLimit = (state: RootState) => false;

export const selectIsAtWeeklyLimit = (state: RootState) => {
  const somedayIds = state.events.getSomedayEvents.value?.data || [];
  return somedayIds.length >= SOMEDAY_WEEKLY_LIMIT;
};

export const selectIsGetSomedayEventsProcessing = (state: RootState) =>
  isProcessing(state.events.getSomedayEvents);

const selectSomedayIds = (state: RootState) =>
  state.events.getSomedayEvents.value?.data || [];

export const selectSomedayEvents = createSelector(
  selectEventEntities,
  selectSomedayIds,
  (entities, somedayIds) => {
    const events: Schema_SomedayEventsColumn["events"] = {};
    somedayIds.forEach((i) => {
      const event = entities[i];
      if (event) {
        events[i] = event;
      }
    });

    const sortedEvents = Object.values(events).sort(
      (a, b) => a.order - b.order
    );
    const sortedIds = sortedEvents.map((e) => e._id);

    const sortedData: Schema_SomedayEventsColumn = {
      columns: {
        [`${COLUMN_WEEK}`]: {
          id: `${COLUMN_WEEK}`,
          eventIds: sortedIds,
        },
        [`${COLUMN_MONTH}`]: {
          id: `${COLUMN_MONTH}`,
          eventIds: sortedIds,
        },
      },
      columnOrder: [`${COLUMN_WEEK}`],
      events,
    };
    return sortedData;
  }
);

export const selectSomedayEventsCount = (state: RootState): number => {
  return state.events.getSomedayEvents.value?.data?.length || 0;
};
