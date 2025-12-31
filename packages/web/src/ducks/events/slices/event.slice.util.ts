import { PayloadAction } from "@reduxjs/toolkit";
import { AsyncState } from "@web/common/store/helpers";
import { Response_HttpPaginatedSuccess } from "@web/common/types/api.types";
import { Action_ConvertEvent, Action_DeleteEvent } from "../event.types";

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
  // Handle case where state.value or state.value.data might be undefined/null
  if (!state.value || !state.value.data) {
    // If state is not initialized, there's nothing to delete
    return;
  }

  const data = state.value.data.filter((i: string) => i !== action.payload._id);

  // Preserve the rest of the state structure (count, page, pageSize, offset)
  Object.assign(state, {
    ...state,
    value: {
      ...state.value,
      data,
    },
  });
};

export const convert = (
  state: AsyncState<Response_HttpPaginatedSuccess<string[]>, unknown>,
  action: Action_ConvertEvent,
): void => {
  cancel(state, { payload: { _id: action.payload.event._id! }, type: "" });
};
