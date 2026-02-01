import { RootState } from "@web/store";

export const selectAuthState = ({ auth }: RootState) => auth;

export const selectAuthStatus = ({ auth }: RootState) => auth.status;

export const selectAuthError = ({ auth }: RootState) => auth.error;

export const selectIsAuthenticating = ({ auth }: RootState) =>
  auth.status === "authenticating";
