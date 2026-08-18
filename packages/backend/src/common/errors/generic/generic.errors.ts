import { Status } from "@core/errors/status.codes";
import { type ErrorMetadata } from "@backend/common/types/error.types";

interface GenericErrors {
  BadRequest: ErrorMetadata;
  DeveloperError: ErrorMetadata;
  NotImplemented: ErrorMetadata;
  NotSure: ErrorMetadata;
  OperationTimeout: ErrorMetadata;
}

export const GenericError: GenericErrors = {
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
    status: Status.NOT_IMPLEMENTED,
    isOperational: true,
  },
  // Prefer typed Sync/auth/event errors on live paths. Kept as a last-resort
  // operational 500 — never Status.UNSURE (600), which is not a real HTTP status.
  NotSure: {
    description: "Not sure why error occurred. See logs",
    status: Status.INTERNAL_SERVER,
    isOperational: true,
  },
  OperationTimeout: {
    description: "Operation timed out",
    status: Status.GATEWAY_TIMEOUT,
    isOperational: true,
  },
};
