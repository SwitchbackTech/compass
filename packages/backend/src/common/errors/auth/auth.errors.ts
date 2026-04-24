import { Status } from "@core/errors/status.codes";
import { type ErrorMetadata } from "@backend/common/types/error.types";

interface AuthErrors {
  DevOnly: ErrorMetadata;
  GoogleAccountAlreadyConnected: ErrorMetadata;
  GoogleConnectEmailMismatch: ErrorMetadata;
  GoogleNotConfigured: ErrorMetadata;
  InadequatePermissions: ErrorMetadata;
  MissingRefreshToken: ErrorMetadata;
  NoUserId: ErrorMetadata;
  NoGAuthAccessToken: ErrorMetadata;
}

export const AuthError: AuthErrors = {
  DevOnly: {
    description: "Only available during development",
    status: Status.FORBIDDEN,
    isOperational: true,
  },
  GoogleAccountAlreadyConnected: {
    code: "GOOGLE_ACCOUNT_ALREADY_CONNECTED",
    description: "Google account is already connected to another Compass user",
    status: Status.CONFLICT,
    isOperational: true,
  },
  GoogleConnectEmailMismatch: {
    code: "GOOGLE_CONNECT_EMAIL_MISMATCH",
    description:
      "Google account email does not match the signed-in Compass account",
    status: Status.CONFLICT,
    isOperational: true,
  },
  GoogleNotConfigured: {
    code: "GOOGLE_NOT_CONFIGURED",
    description: "Google is not configured for this Compass instance",
    status: Status.SERVICE_UNAVAILABLE,
    isOperational: true,
  },
  InadequatePermissions: {
    description: "You don't have permission to do that",
    status: Status.FORBIDDEN,
    isOperational: true,
  },
  MissingRefreshToken: {
    description: "No refresh token",
    status: Status.BAD_REQUEST,
    isOperational: true,
  },
  NoUserId: {
    description: "Compass user was not created",
    status: Status.INTERNAL_SERVER,
    isOperational: false,
  },
  NoGAuthAccessToken: {
    description: "No gauth access token",
    status: Status.UNAUTHORIZED,
    isOperational: true,
  },
};
