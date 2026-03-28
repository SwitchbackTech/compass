import { type PayloadAction, createSlice } from "@reduxjs/toolkit";
import { type AsyncState, createAsyncSlice } from "@web/common/store/helpers";
import { type Sync_AsyncStateContextReason } from "@web/ducks/events/context/sync.context";

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

export interface ImportResults {
  eventsCount?: number;
  calendarsCount?: number;
  localEventsSynced?: number;
}

type ImportGCalExtraState = {
  isRepairing: boolean;
  importResults: ImportResults | null;
  pendingLocalEventsSynced: number | null;
  importError: string | null;
};

const importGCalReducers = {
  startRepair: (
    state: AsyncState<undefined, undefined> & ImportGCalExtraState,
  ) => {
    state.isRepairing = true;
  },
  stopRepair: (
    state: AsyncState<undefined, undefined> & ImportGCalExtraState,
  ) => {
    state.isRepairing = false;
  },
  setLocalEventsSynced: (
    state: AsyncState<undefined, undefined> & ImportGCalExtraState,
    action: PayloadAction<number>,
  ) => {
    state.pendingLocalEventsSynced = action.payload;
  },
  setImportResults: (
    state: AsyncState<undefined, undefined> & ImportGCalExtraState,
    action: PayloadAction<{
      eventsCount?: number;
      calendarsCount?: number;
    }>,
  ) => {
    state.isRepairing = false;
    state.importError = null;
    state.importResults = {
      ...action.payload,
      localEventsSynced: state.pendingLocalEventsSynced ?? undefined,
    };
    state.pendingLocalEventsSynced = null;
  },
  setImportError: (
    state: AsyncState<undefined, undefined> & ImportGCalExtraState,
    action: PayloadAction<string>,
  ) => {
    state.isRepairing = false;
    state.importError = action.payload;
    state.importResults = null;
    state.pendingLocalEventsSynced = null;
  },
  clearImportResults: (
    state: AsyncState<undefined, undefined> & ImportGCalExtraState,
  ) => {
    state.importResults = null;
    state.importError = null;
  },
};

export const importGCalSlice = createAsyncSlice<
  never,
  undefined,
  undefined,
  ImportGCalExtraState,
  typeof importGCalReducers
>({
  name: "importGCal",
  initialState: {
    isRepairing: false,
    importResults: null,
    pendingLocalEventsSynced: null,
    importError: null,
  },
  reducers: importGCalReducers,
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
