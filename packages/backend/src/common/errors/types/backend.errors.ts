import { BaseError } from "@core/errors/errors.base";
import { Status } from "@core/errors/status.codes";

interface ErrorMetadata {
  description: string;
  isOperational: boolean;
  status: number;
}

export const error = (err: ErrorMetadata, result: string) => {
  return new BaseError(result, err.description, err.status, err.isOperational);
};

export const AuthError = {
  MissingRefreshToken: {
    description: "No refresh token",
    status: Status.BAD_REQUEST,
    isOperational: true,
  },
  UserCreateFailed: {
    description: "Compass user was not created",
    status: Status.INTERNAL_SERVER,
    isOperational: false,
  },
  PaginationNotSupported: {
    description: "Code doesn't support calendarlist pagination yet",
    status: Status.INTERNAL_SERVER,
    isOperational: true,
  },
};

export const EventError = {
  Gone: {
    description: "Resource is gone",
    status: Status.GONE,
    isOperational: true,
  },
  MissingGevents: {
    description: "# of created events !== # saved in DB",
    status: Status.INTERNAL_SERVER,
    isOperational: true,
  },
  NoGevents: {
    description: "Unexpected empty values in events",
    status: Status.NO_CONTENT,
    isOperational: true,
  },
  NoSyncToken: {
    description: "nextSyncToken is missing",
    status: Status.INTERNAL_SERVER,
    isOperational: true,
  },
};

export const GcalError = {
  Unsure: {
    description: "generic gCal API Error",
    status: Status.UNSURE,
    isOperational: true,
  },
};

export const SyncError = {
  MissingResourceId: {
    description: "No resourceId provided",
    status: Status.NO_CONTENT,
    isOperational: true,
  },
};
