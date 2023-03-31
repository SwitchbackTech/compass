import { createAsyncSlice } from "@web/common/store/helpers";
import { Response_HttpPaginatedSuccess } from "@web/common/types/api.types";
import { Payload_NormalizedAsyncAction } from "@web/common/types/entity.types";

import { Payload_GetEvents, Action_DeleteEvent } from "../event.types";

export const getWeekEventsSlice = createAsyncSlice<
  Payload_GetEvents,
  Response_HttpPaginatedSuccess<Payload_NormalizedAsyncAction>
>({
  name: "getWeekEvents",
  reducers: {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    convert: () => {},
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
  },
});
