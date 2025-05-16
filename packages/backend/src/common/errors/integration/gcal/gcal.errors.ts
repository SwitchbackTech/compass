import { Status } from "@core/errors/status.codes";
import { ErrorMetadata } from "@backend/common/types/error.types";

interface GcalErrors {
  CalendarlistMissing: ErrorMetadata;
  CodeInvalid: ErrorMetadata;
  CodeMissing: ErrorMetadata;
  NoSyncToken: ErrorMetadata;
  PaginationNotSupported: ErrorMetadata;
  Unauthorized: ErrorMetadata;
  Unsure: ErrorMetadata;
}

export const GcalError: GcalErrors = {
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
