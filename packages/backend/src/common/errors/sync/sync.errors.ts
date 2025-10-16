import { Status } from "@core/errors/status.codes";
import { ErrorMetadata } from "@backend/common/types/error.types";

interface SyncErrors {
  AccessRevoked: ErrorMetadata;
  EventWatchExists: ErrorMetadata;
  CalendarWatchExists: ErrorMetadata;
  NoGCalendarId: ErrorMetadata;
  NoResourceId: ErrorMetadata;
  NoSyncToken: ErrorMetadata;
  NoEventChanges: ErrorMetadata;
  NoSyncRecordForUser: ErrorMetadata;
}

export const SyncError: SyncErrors = {
  AccessRevoked: {
    description: "User revoked access to their 3rd-party calendar (GCal)",
    status: Status.GONE,
    isOperational: true,
  },
  EventWatchExists: {
    description: "Event watch already exists",
    status: Status.BAD_REQUEST,
    isOperational: true,
  },
  CalendarWatchExists: {
    description: "Calendar watch already exists",
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
