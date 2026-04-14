import { type ErrorMetadata } from "@backend/common/types/error.types";
import { Status } from "@core/errors/status.codes";

interface AuthErrors {
  DevOnly: ErrorMetadata;
  GoogleAccountAlreadyConnected: ErrorMetadata;
  GoogleConnectEmailMismatch: ErrorMetadata;
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
