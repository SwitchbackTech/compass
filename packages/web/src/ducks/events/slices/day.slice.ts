import { PayloadAction } from "@reduxjs/toolkit";
import { AsyncState, createAsyncSlice } from "@web/common/store/helpers";
import { Response_HttpPaginatedSuccess } from "@web/common/types/api.types";
import { Payload_NormalizedAsyncAction } from "@web/common/types/entity.types";
import { Payload_GetEvents } from "@web/ducks/events/event.types";
import { cancel, convert, insert } from "./event.slice.util";

const replace = (
  state: AsyncState<Response_HttpPaginatedSuccess<string[]>, unknown>,
  action: PayloadAction<{ oldDayId: string; newDayId: string }>,
): void => {
  cancel(state, { payload: { _id: action.payload.oldDayId }, type: "" });
  insert(state, { payload: action.payload.newDayId, type: "" });
};

const reducers = {
  convert,
  insert,
  delete: cancel,
  replace,
};

export const getDayEventsSlice = createAsyncSlice<
  Payload_GetEvents,
  Response_HttpPaginatedSuccess<Payload_NormalizedAsyncAction>,
  unknown,
  AsyncState<Response_HttpPaginatedSuccess<string[]>, unknown>,
  typeof reducers
>({
  name: "getDayEvents",
  reducers,
});
