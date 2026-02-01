import { PayloadAction, createSlice } from "@reduxjs/toolkit";

export type AuthStatus = "idle" | "authenticating" | "success" | "error";

interface AuthState {
  status: AuthStatus;
  error: string | null;
}

const initialState: AuthState = {
  status: "idle",
  error: null,
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
    resetAuth: (state) => {
      state.status = "idle";
      state.error = null;
    },
  },
});

export const { startAuthenticating, authSuccess, authError, resetAuth } =
  authSlice.actions;
