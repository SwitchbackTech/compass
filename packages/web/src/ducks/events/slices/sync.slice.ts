import { PayloadAction, createSlice } from "@reduxjs/toolkit";
import { Sync_AsyncStateContextReason } from "@web/ducks/events/context/sync.context";
import { createAsyncSlice } from "../../../common/store/helpers";

type Payload_TriggerFetch = {
  reason?: Sync_AsyncStateContextReason;
};

interface State_Sync {
  isFetchNeeded: boolean;
  reason: null | Sync_AsyncStateContextReason;
}

const initialState: State_Sync = {
  isFetchNeeded: false,
  reason: null,
};

export const importGCalSlice = createAsyncSlice<
  never,
  never,
  never,
  { importing: boolean }
>({
  name: "importGCal",
  initialState: { importing: false },
  reducers: {
    importing: (state, action: PayloadAction<boolean>) => {
      state.importing = action.payload;
    },
  },
});

export const importLatestSlice = createSlice({
  name: "importLatest",
  initialState,
  reducers: {
    triggerFetch: {
      reducer: (
        state,
        action: PayloadAction<Payload_TriggerFetch | undefined>,
      ) => {
        state.isFetchNeeded = true;
        state.reason = action.payload?.reason || null;
      },
      prepare: (payload?: Payload_TriggerFetch) => {
        return {
          payload: payload || ({} as Payload_TriggerFetch),
        };
      },
    },
    resetIsFetchNeeded: {
      reducer: (state) => {
        state.isFetchNeeded = false;
        state.reason = null;
      },
      prepare: () => {
        return {
          payload: {},
        };
      },
    },
  },
});

export const { triggerFetch, resetIsFetchNeeded } = importLatestSlice.actions;
