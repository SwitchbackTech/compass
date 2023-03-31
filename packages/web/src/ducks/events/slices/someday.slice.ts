import { createAsyncSlice } from "@web/common/store/helpers";
import { Response_HttpPaginatedSuccess } from "@web/common/types/api.types";
import { Payload_NormalizedAsyncAction } from "@web/common/types/entity.types";

import { Payload_GetEvents, Action_DeleteEvent } from "../event.types";
import { Action_Someday_Reorder } from "../types/someday.slice.types";

export const getSomedayEventsSlice = createAsyncSlice<
  Payload_GetEvents,
  Response_HttpPaginatedSuccess<Payload_NormalizedAsyncAction>
>({
  name: "getSomedayEvents",
  reducers: {
    convert: (state, action) => {
      return;
    },
    delete: (state, action: Action_DeleteEvent) => {
      state.value.data = state.value.data.filter(
        (i: string) => i !== action.payload._id
      );
    },
    insert: (state, action: { payload: string }) => {
      // payload is the event id
      if (state.value === null || state.value === undefined) {
        console.log("error: state.value needs to be initialized");
      } else {
        state.value.data.push(action.payload);
      }
    },
    // reorder: (state, action: { payload: { _id: string; order: number }[] }) => {
    reorder: (state, action) => {
      return;
    },
    //++
    // reorder: (state, action: Action_Someday_Reorder) => {
    //   const { origIndex, newIndex, reorderedEvent, somedayEvents } =
    //     action.payload;

    //   //   const column = somedayEvents.columns[source.droppableId];
    //   const column = somedayEvents.columns[reorderedEvent];
    //   const newEventIds = Array.from(column.eventIds);
    //   //   newEventIds.splice(source.index, 1);
    //   newEventIds.splice(origIndex, 1);
    //   newEventIds.splice(newIndex, 0, reorderedEvent);
    //   const newColumn = {
    //     ...column,
    //     eventIds: newEventIds,
    //   };

    //   const newState = {
    //     ...somedayEvents,
    //     columns: {
    //       ...somedayEvents.columns,
    //       [newColumn.id]: newColumn,
    //     },
    //   };
    // },
    remove: (state, action: Action_DeleteEvent) => {
      // same as 'delete', but duplicating to
      // prevent migrate saga from deleting event
      // from DB
      state.value.data = state.value.data.filter(
        (i: string) => i !== action.payload._id
      );
    },
  },
});
