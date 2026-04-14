import { type ErrorMetadata } from "@backend/common/types/error.types";
import { Status } from "@core/errors/status.codes";

interface WatchErrors {
  EventWatchExists: ErrorMetadata;
  CalendarWatchExists: ErrorMetadata;
  NoWatchRecordForUser: ErrorMetadata;
}

export const WatchError: WatchErrors = {
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
  NoWatchRecordForUser: {
    description: "No watch record found for user",
    status: Status.BAD_REQUEST,
    isOperational: true,
  },
};
