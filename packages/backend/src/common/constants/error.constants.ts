import { ErrorConstant } from "@core/errors/errors.base";
import { Status } from "@core/errors/status.codes";

export const DbError: ErrorConstant = {
  InvalidId: {
    description: "id is invalid (according to Mongo)",
    status: Status.BAD_REQUEST,
    isOperational: true,
  },
};

export const EventError: ErrorConstant = {
  Gone: {
    description: "Resource is gone",
    status: Status.GONE,
    isOperational: true,
  },
  InvalidRecurrence: {
    description: "Invalid recurrence",
    status: Status.BAD_REQUEST,
    isOperational: true,
  },
  MissingCompassEvent: {
    description: "Compass event not found",
    status: Status.NOT_FOUND,
    isOperational: true,
  },
  MissingGevents: {
    description: "# of created events !== # saved in DB",
    status: Status.INTERNAL_SERVER,
    isOperational: true,
  },
  MissingProperty: {
    description: "A required property is missing",
    status: Status.BAD_REQUEST,
    isOperational: true,
  },
  NoGevents: {
    description: "Unexpected empty values in events",
    status: Status.NO_CONTENT,
    isOperational: true,
  },
  NoMatchingEvent: {
    description: "Invalid event id (most likely)",
    status: Status.REDUX_REFRESH_NEEDED,
    isOperational: true,
  },
};

export const GenericError: ErrorConstant = {
  BadRequest: {
    description: "Request is malformed",
    status: Status.BAD_REQUEST,
    isOperational: true,
  },
  DeveloperError: {
    description: "Developer made a logic error",
    status: Status.INTERNAL_SERVER,
    isOperational: true,
  },
  NotImplemented: {
    description: "Not implemented yet",
    status: Status.UNSURE,
    isOperational: true,
  },
  NotSure: {
    description: "Not sure why error occured. See logs",
    status: Status.UNSURE,
    isOperational: true,
  },
};

export const GcalError: ErrorConstant = {
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

export const SocketError: ErrorConstant = {
  InvalidSocketId: {
    description: "Invalid socket id",
    status: Status.BAD_REQUEST,
    isOperational: true,
  },
  ServerNotReady: {
    description:
      "WebSocket server not ready (Did you forget to initialize it?)",
    status: Status.INTERNAL_SERVER,
    isOperational: false,
  },
};

export const SyncError: ErrorConstant = {
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
    status: Status.INTERNAL_SERVER,
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
};

export const UserError: ErrorConstant = {
  InvalidValue: {
    description: "User has an invalid value",
    status: Status.BAD_REQUEST,
    isOperational: true,
  },
  MissingGoogleUserField: {
    description: "Email field is missing from the Google user object",
    status: Status.NOT_FOUND,
    isOperational: true,
  },
  MissingUserIdField: {
    description: "Failed to access the userId",
    status: Status.BAD_REQUEST,
    isOperational: true,
  },
  UserNotFound: {
    description: "User not found",
    status: Status.NOT_FOUND,
    isOperational: true,
  },
};
