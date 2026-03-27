import { Status } from "@core/errors/status.codes";
import { type ErrorMetadata } from "@backend/common/types/error.types";

interface AuthErrors {
  DevOnly: ErrorMetadata;
  GoogleAccountAlreadyConnected: ErrorMetadata;
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
    description: "Google account is already connected to another Compass user",
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
