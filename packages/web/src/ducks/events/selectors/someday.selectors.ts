import { COLUMN_WEEK } from "@web/common/constants/web.constants";
import { isProcessing } from "@web/common/store/helpers";
import { Schema_SomedayEventsColumn } from "@web/common/types/web.event.types";
import { RootState } from "@web/store";
import { createSelector } from "reselect";

import { selectEventEntities } from "./event.selectors";

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
