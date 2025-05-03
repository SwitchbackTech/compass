import { PayloadAction, createSlice } from "@reduxjs/toolkit";
import { Sync_AsyncStateContextReason } from "@web/ducks/events/context/sync.context";

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

export const syncSlice = createSlice({
  name: "sync",
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

export const { triggerFetch, resetIsFetchNeeded } = syncSlice.actions;
