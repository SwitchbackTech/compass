import { createAsyncSlice } from "@web/common/store/helpers";
import { Response_HttpPaginatedSuccess } from "@web/common/types/api.types";
import { Payload_NormalizedAsyncAction } from "@web/common/types/entity.types";
import { Action_DeleteEvent, Payload_GetEvents } from "../event.types";

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
        (i: string) => i !== action.payload._id,
      );
    },

    insert: (state, action: { payload: string }) => {
      // payload is the event id
      if (state.value === null || state.value === undefined) {
        console.error("error: state.value needs to be initialized");
      } else {
        state.value.data.push(action.payload);
      }
    },

    replace: (
      state,
      action: { payload: { oldSomedayId: string; newSomedayId: string } },
    ) => {
      state.value.data = state.value.data.map((id: string) => {
        if (id === action.payload.oldSomedayId) {
          return action.payload.newSomedayId;
        }
        return id;
      });
    },

    reorder: (state, action) => {
      return;
    },

    remove: (state, action: Action_DeleteEvent) => {
      // same as 'delete', but duplicating to
      // prevent migrate saga from deleting event
      // from DB
      state.value.data = state.value.data.filter(
        (i: string) => i !== action.payload._id,
      );
    },
  },
});
