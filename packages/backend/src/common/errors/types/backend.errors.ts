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

export const genericError = (
  e: unknown,
  result: string,
  status = Status.INTERNAL_SERVER,
  isOperational = true
) => {
  const _e = e as Error;
  const name = _e.name || "GenericName";
  const description = `${name}: ${_e.message || "GenericMsg"}`;
  const cause = { description, isOperational, status };
  return error(cause, result);
};

export const AuthError = {
  DevOnly: {
    description: "Only available during development",
    status: Status.FORBIDDEN,
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
  DeveloperError: {
    description: "Developer made a logic error",
    status: Status.INTERNAL_SERVER,
    isOperational: true,
  },
};

export const GcalError = {
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
  NoSyncToken: {
    description: "nextSyncToken is missing",
    status: Status.INTERNAL_SERVER,
    isOperational: true,
  },
  PaginationNotSupported: {
    description: "Compass doesn't support pagination yet",
    status: Status.INTERNAL_SERVER,
    isOperational: true,
  },
  Unauthorized: {
    description: "Not Authorized",
    status: Status.FORBIDDEN,
    isOperational: true,
  },
  Unsure: {
    description: "generic gCal API Error",
    status: Status.UNSURE,
    isOperational: true,
  },
};

export const SyncError = {
  AccessRevoked: {
    description: "User revoked access to their 3rd-party calendar (GCal)",
    status: Status.GONE,
    isOperational: true,
  },
  CalendarWatchExists: {
    description: "Watch already exists",
    status: Status.BAD_REQUEST,
    isOperational: true,
  },
  NoGCalendarId: {
    description: "No gCalendarId",
    status: Status.NO_CONTENT,
    isOperational: true,
  },
  NoResourceId: {
    description: "No resourceId provided",
    status: Status.NO_CONTENT,
    isOperational: true,
  },
  NoSyncToken: {
    description: "No syncToken",
    status: Status.NO_CONTENT,
    isOperational: true,
  },
  NoEventChanges: {
    description: "Nothing changed",
    status: Status.BAD_REQUEST,
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
