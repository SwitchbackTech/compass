import { Status } from "@core/errors/status.codes";
import { ErrorMetadata } from "@backend/common/types/error.types";

interface EventErrors {
  Gone: ErrorMetadata;
  InvalidRecurrence: ErrorMetadata;
  MissingCompassEvent: ErrorMetadata;
  MissingGevents: ErrorMetadata;
  MissingProperty: ErrorMetadata;
  NoGevents: ErrorMetadata;
  NoMatchingEvent: ErrorMetadata;
}

export const EventError: EventErrors = {
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
