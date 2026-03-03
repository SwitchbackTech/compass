import { type PayloadAction } from "@reduxjs/toolkit";
import { type AsyncState, createAsyncSlice } from "@web/common/store/helpers";
import { type Response_HttpPaginatedSuccess } from "@web/common/types/api.types";
import { type Payload_NormalizedAsyncAction } from "@web/common/types/entity.types";
import { type Payload_GetEvents } from "@web/ducks/events/event.types";
import { cancel, convert, insert } from "./event.slice.util";

const replace = (
  state: AsyncState<Response_HttpPaginatedSuccess<string[]>, unknown>,
  action: PayloadAction<{ oldWeekId: string; newWeekId: string }>,
): void => {
  cancel(state, { payload: { _id: action.payload.oldWeekId }, type: "" });
  insert(state, { payload: action.payload.newWeekId, type: "" });
};

const reducers = {
  convert,
  insert,
  delete: cancel,
  replace,
};

export const getWeekEventsSlice = createAsyncSlice<
  Payload_GetEvents,
  Response_HttpPaginatedSuccess<Payload_NormalizedAsyncAction>,
  unknown,
  AsyncState<Response_HttpPaginatedSuccess<string[]>, unknown>,
  typeof reducers
>({
  name: "getWeekEvents",
  reducers,
});
