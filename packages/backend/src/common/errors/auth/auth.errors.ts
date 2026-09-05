import { Status } from "@core/errors/status.codes";
import {
  type ProviderKind,
  providerDisplayName,
} from "@core/types/sync/identity.contracts";
import { type ErrorMetadata } from "@backend/common/types/error.types";

interface AuthErrors {
  DevOnly: ErrorMetadata;
  GoogleAccountAlreadyConnected: ErrorMetadata;
  GoogleConnectEmailMismatch: ErrorMetadata;
  GoogleNotConfigured: ErrorMetadata;
  ProviderNotConfigured: ErrorMetadata;
  GoogleRedirectUriMismatch: ErrorMetadata;
  GoogleRefreshTokenMissing: ErrorMetadata;
  GoogleSignInWhileAuthenticated: ErrorMetadata;
  InadequatePermissions: ErrorMetadata;
  NoGAuthAccessToken: ErrorMetadata;
  SyncConnectionUnavailable: ErrorMetadata;
}

const calendarHostLabel = (provider?: ProviderKind): string =>
  provider ? providerDisplayName(provider) : "your calendar";

export const authErrorCopy = {
  accountAlreadyConnected: (provider?: ProviderKind) =>
    `${calendarHostLabel(provider)} account is already connected to another Compass user`,
  connectEmailMismatch: (provider?: ProviderKind) =>
    `${calendarHostLabel(provider)} account email does not match the signed-in Compass account`,
  notConfigured: (provider?: ProviderKind) =>
    `${calendarHostLabel(provider)} is not configured for this Compass instance`,
  redirectUriMismatch: (provider?: ProviderKind) =>
    `${calendarHostLabel(provider)} redirect URI does not match this Compass instance`,
  refreshTokenMissing: (provider?: ProviderKind) =>
    `${calendarHostLabel(provider)} did not grant a fresh authorization. Please try again.`,
  signInWhileAuthenticated: (provider?: ProviderKind) =>
    `You're already signed in. Use Settings → Add account to connect this ${calendarHostLabel(provider)} account.`,
};

export const AuthError: AuthErrors = {
  DevOnly: {
    description: "Only available during development",
    status: Status.FORBIDDEN,
    isOperational: true,
  },
  GoogleAccountAlreadyConnected: {
    code: "GOOGLE_ACCOUNT_ALREADY_CONNECTED",
    description: authErrorCopy.accountAlreadyConnected("google"),
    status: Status.CONFLICT,
    isOperational: true,
  },
  GoogleConnectEmailMismatch: {
    code: "GOOGLE_CONNECT_EMAIL_MISMATCH",
    description: authErrorCopy.connectEmailMismatch("google"),
    status: Status.CONFLICT,
    isOperational: true,
  },
  GoogleNotConfigured: {
    code: "GOOGLE_NOT_CONFIGURED",
    description: authErrorCopy.notConfigured("google"),
    status: Status.SERVICE_UNAVAILABLE,
    isOperational: true,
  },
  ProviderNotConfigured: {
    code: "PROVIDER_NOT_CONFIGURED",
    description: authErrorCopy.notConfigured(),
    status: Status.CONFLICT,
    isOperational: true,
  },
  GoogleRedirectUriMismatch: {
    description: authErrorCopy.redirectUriMismatch("google"),
    status: Status.BAD_REQUEST,
    isOperational: true,
  },
  GoogleRefreshTokenMissing: {
    code: "GOOGLE_REFRESH_TOKEN_MISSING",
    description: authErrorCopy.refreshTokenMissing("google"),
    status: Status.CONFLICT,
    isOperational: true,
  },
  GoogleSignInWhileAuthenticated: {
    code: "GOOGLE_SIGNIN_WHILE_AUTHENTICATED",
    description: authErrorCopy.signInWhileAuthenticated("google"),
    status: Status.CONFLICT,
    isOperational: true,
  },
  InadequatePermissions: {
    description: "You don't have permission to do that",
    status: Status.FORBIDDEN,
    isOperational: true,
  },
  NoGAuthAccessToken: {
    description: "No gauth access token",
    status: Status.UNAUTHORIZED,
    isOperational: true,
  },
  SyncConnectionUnavailable: {
    description: "Could not reach the sync service to start a connection",
    status: Status.SERVICE_UNAVAILABLE,
    isOperational: true,
  },
};
