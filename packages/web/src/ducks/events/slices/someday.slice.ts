import { PayloadAction } from "@reduxjs/toolkit";
import { AsyncState, createAsyncSlice } from "@web/common/store/helpers";
import { Response_HttpPaginatedSuccess } from "@web/common/types/api.types";
import { Payload_NormalizedAsyncAction } from "@web/common/types/entity.types";
import {
  Action_ConvertEvent,
  Action_DeleteEvent,
  Payload_GetEvents,
} from "../event.types";

export const insert = (
  state: AsyncState<Response_HttpPaginatedSuccess<string[]>, unknown>,
  action: PayloadAction<string>,
): void => {
  // payload is the event id
  if (state.value === null || state.value === undefined) {
    console.warn("warning: state.value is not initialized, initializing...");

    state.value = {
      count: 1,
      pageSize: 1,
      page: 1,
      offset: 0,
      data: [action.payload],
    };
  } else {
    if (!state.value.data) state.value.data = [];

    state.value.data.push(action.payload);
  }
};

export const cancel = (
  state: AsyncState<Response_HttpPaginatedSuccess<string[]>, unknown>,
  action: Action_DeleteEvent,
): void => {
  const data = state.value?.data.filter(
    (i: string) => i !== action.payload._id,
  );

  Object.assign(state, { ...state, value: { data } });
};

export const convert = (
  state: AsyncState<Response_HttpPaginatedSuccess<string[]>, unknown>,
  action: Action_ConvertEvent,
): void => {
  cancel(state, { payload: { _id: action.payload.event._id! }, type: "" });
};

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
