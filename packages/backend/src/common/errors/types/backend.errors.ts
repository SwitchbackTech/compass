import { BaseError } from "@core/errors/errors.base";
import { Status } from "@core/errors/status.codes";

interface ErrorMetadata {
  description: string;
  isOperational: boolean;
  status: number;
}

export const error = (cause: ErrorMetadata, result: string) => {
  return new BaseError(
    result,
    cause.description,
    cause.status,
    cause.isOperational
  );
};

export const AuthError = {
  DevOnly: {
    description: "Only available during development",
    status: Status.FORBIDDEN,
    isOperational: true,
  },
  MissingRefreshToken: {
    description: "No refresh token",
    status: Status.BAD_REQUEST,
    isOperational: true,
  },
  PaginationNotSupported: {
    description: "Code doesn't support calendarlist pagination yet",
    status: Status.INTERNAL_SERVER,
    isOperational: true,
  },
  UserCreateFailed: {
    description: "Compass user was not created",
    status: Status.INTERNAL_SERVER,
    isOperational: false,
  },
};

export const DbError = {
  InvalidId: {
    description: "id is invalid (according to Mongo)",
    status: Status.BAD_REQUEST,
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

export const GenericError = {
  NotImplemented: {
    description: "not implemented yet",
    status: Status.UNSURE,
    isOperational: true,
  },
  NotSure: {
    description: "Not sure why error occured. See logs",
    status: Status.UNSURE,
    isOperational: true,
  },
};

export const GcalError = {
  Unsure: {
    description: "generic gCal API Error",
    status: Status.UNSURE,
    isOperational: true,
  },
  CalendarlistMissing: {
    description: "No calendarlist",
    status: Status.BAD_REQUEST,
    isOperational: true,
  },
  CodeInvalid: {
    description: "Invalid gAPI code",
    status: Status.BAD_REQUEST,
    isOperational: true,
  },
  CodeMissing: {
    description: "Missing gAPI code",
    status: Status.FORBIDDEN,
    isOperational: true,
  },
};

export const SyncError = {
  CalendarWatchExists: {
    description: "Watch already exists",
    status: Status.BAD_REQUEST,
    isOperational: true,
  },
  ChannelDoesNotExist: {
    description: "Channel does not exist",
    status: Status.GONE,
    isOperational: true,
  },
  MissingResourceId: {
    description: "No resourceId provided",
    status: Status.NO_CONTENT,
    isOperational: true,
  },
  NoSyncRecordForUser: {
    description: "No sync record for user",
    status: Status.BAD_REQUEST,
    isOperational: true,
  },
  NoWatchesForUser: {
    description: "No active watches for user",
    status: Status.GONE,
    isOperational: true,
  },
};

export const UserError = {
  MultipleUsersFound: {
    description: "Multiple users were found matching the filter",
    status: Status.BAD_REQUEST,
    isOperational: true,
  },
};
