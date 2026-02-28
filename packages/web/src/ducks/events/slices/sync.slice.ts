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

export interface ImportResults {
  eventsCount?: number;
  calendarsCount?: number;
  localEventsSynced?: number;
}

export const importGCalSlice = createAsyncSlice<
  never,
  undefined,
  undefined,
  {
    importing: boolean;
    importResults: ImportResults | null;
    pendingLocalEventsSynced: number | null;
    isImportPending: boolean;
    importError: string | null;
  }
>({
  name: "importGCal",
  initialState: {
    importing: false,
    importResults: null,
    pendingLocalEventsSynced: null,
    isImportPending: false,
    importError: null,
  },
  reducers: {
    importing: (state, action: PayloadAction<boolean>) => {
      state.importing = action.payload;
    },
    setIsImportPending: (state, action: PayloadAction<boolean>) => {
      state.isImportPending = action.payload;
      if (action.payload) {
        state.importError = null;
      }
    },
    setLocalEventsSynced: (state, action: PayloadAction<number>) => {
      state.pendingLocalEventsSynced = action.payload;
    },
    setImportResults: (
      state,
      action: PayloadAction<{
        eventsCount?: number;
        calendarsCount?: number;
      }>,
    ) => {
      state.importing = false;
      state.isImportPending = false;
      state.importError = null;
      state.importResults = {
        ...action.payload,
        localEventsSynced: state.pendingLocalEventsSynced ?? undefined,
      };
      state.pendingLocalEventsSynced = null;
    },
    setImportError: (state, action: PayloadAction<string>) => {
      state.importing = false;
      state.isImportPending = false;
      state.importError = action.payload;
      state.importResults = null;
      state.pendingLocalEventsSynced = null;
    },
    clearImportResults: (state) => {
      state.importResults = null;
      state.importError = null;
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
