import { createSelector } from "reselect";
import { SOMEDAY_WEEKLY_LIMIT } from "@core/constants/core.constants";
import { COLUMN_MONTH, COLUMN_WEEK } from "@web/common/constants/web.constants";
import { isProcessing } from "@web/common/store/helpers";
import { Schema_SomedayEventsColumn } from "@web/common/types/web.event.types";
import { RootState } from "@web/store";
import dayjs from "dayjs";

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
