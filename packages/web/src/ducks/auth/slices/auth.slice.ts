import { type PayloadAction, createSlice } from "@reduxjs/toolkit";
import {
  type GoogleConnectionStatus,
  type GoogleSyncStatus,
} from "@core/types/user.types";

export type AuthStatus = "idle" | "authenticating" | "success" | "error";
export interface GoogleAuthStatusState {
  connectionStatus: GoogleConnectionStatus;
  syncStatus: GoogleSyncStatus;
}

export const DEFAULT_GOOGLE_AUTH_STATUS: GoogleAuthStatusState = {
  connectionStatus: "not_connected",
  syncStatus: "none",
};

interface AuthState {
  status: AuthStatus;
  error: string | null;
  google: GoogleAuthStatusState;
}

const initialState: AuthState = {
  status: "idle",
  error: null,
  google: DEFAULT_GOOGLE_AUTH_STATUS,
};

export const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    startAuthenticating: (state) => {
      state.status = "authenticating";
      state.error = null;
    },
    authSuccess: (state) => {
      state.status = "success";
      state.error = null;
    },
    authError: (state, action: PayloadAction<string>) => {
      state.status = "error";
      state.error = action.payload;
    },
    setGoogleStatus: (state, action: PayloadAction<GoogleAuthStatusState>) => {
      state.google = action.payload;
    },
    resetAuth: () => {
      return initialState;
    },
  },
});

export const {
  startAuthenticating,
  authSuccess,
  authError,
  setGoogleStatus,
  resetAuth,
} = authSlice.actions;
