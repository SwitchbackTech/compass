import { type PayloadAction } from "@reduxjs/toolkit";
import { type AsyncState, createAsyncSlice } from "@web/common/store/helpers";
import { type Response_HttpPaginatedSuccess } from "@web/common/types/api.types";
import { type Payload_NormalizedAsyncAction } from "@web/common/types/entity.types";
import { type Payload_GetEvents } from "../event.types";
import { cancel, convert, insert } from "./event.slice.util";

const replace = (
  state: AsyncState<Response_HttpPaginatedSuccess<string[]>, unknown>,
  action: PayloadAction<{ oldSomedayId: string; newSomedayId: string }>,
): void => {
  cancel(state, { payload: { _id: action.payload.oldSomedayId }, type: "" });
  insert(state, { payload: action.payload.newSomedayId, type: "" });
};

const reorder = () => {};

const reducers = {
  convert,
  delete: cancel,
  insert,
  replace,
  reorder,
};

export const getSomedayEventsSlice = createAsyncSlice<
  Payload_GetEvents,
  Response_HttpPaginatedSuccess<Payload_NormalizedAsyncAction>,
  unknown,
  AsyncState<Response_HttpPaginatedSuccess<string[]>, unknown>,
  typeof reducers
>({
  name: "getSomedayEvents",
  reducers,
});
