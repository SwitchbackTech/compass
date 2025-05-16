import { ErrorConstant } from "@core/errors/errors.base";
import { Status } from "@core/errors/status.codes";

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
