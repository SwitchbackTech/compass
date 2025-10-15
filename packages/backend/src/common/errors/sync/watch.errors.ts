import { Status } from "@core/errors/status.codes";
import { ErrorMetadata } from "@backend/common/types/error.types";

interface WatchErrors {
  EventWatchExists: ErrorMetadata;
  CalendarWatchExists: ErrorMetadata;
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
};
