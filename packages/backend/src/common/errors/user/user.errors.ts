import { Status } from "@core/errors/status.codes";
import { type ErrorMetadata } from "@backend/common/types/error.types";

interface UserErrors {
  DeleteCleanupFailed: ErrorMetadata;
  InvalidValue: ErrorMetadata;
  MissingGoogleRefreshToken: ErrorMetadata;
  MissingUserIdField: ErrorMetadata;
  RecentAuthenticationRequired: ErrorMetadata;
  UserNotFound: ErrorMetadata;
}

export const UserError: UserErrors = {
  DeleteCleanupFailed: {
    description: "Failed to fully delete the user's auth state",
    status: Status.INTERNAL_SERVER,
    isOperational: true,
  },
  InvalidValue: {
    description: "User has an invalid value",
    status: Status.BAD_REQUEST,
    isOperational: true,
  },
  MissingGoogleRefreshToken: {
    description: "User is missing a Google refresh token",
    status: Status.BAD_REQUEST,
    isOperational: true,
  },
  MissingUserIdField: {
    description: "Failed to access the userId",
    status: Status.BAD_REQUEST,
    isOperational: true,
  },
  RecentAuthenticationRequired: {
    description:
      "For security, sign out and sign back in before deleting your account",
    status: Status.FORBIDDEN,
    isOperational: true,
    code: "RECENT_AUTHENTICATION_REQUIRED",
  },
  UserNotFound: {
    description: "User not found",
    status: Status.NOT_FOUND,
    isOperational: true,
  },
};
