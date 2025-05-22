import { Status } from "@core/errors/status.codes";
import { ErrorMetadata } from "@backend/common/types/error.types";

interface GenericErrors {
  BadRequest: ErrorMetadata;
  DeveloperError: ErrorMetadata;
  NotImplemented: ErrorMetadata;
  NotSure: ErrorMetadata;
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
    status: Status.UNSURE,
    isOperational: true,
  },
  NotSure: {
    description: "Not sure why error occurred. See logs",
    status: Status.UNSURE,
    isOperational: true,
  },
};
