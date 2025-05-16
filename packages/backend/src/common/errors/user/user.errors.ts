import { Status } from "@core/errors/status.codes";
import { ErrorMetadata } from "@backend/common/types/error.types";

interface UserErrors {
  InvalidValue: ErrorMetadata;
  MissingGoogleUserField: ErrorMetadata;
  MissingUserIdField: ErrorMetadata;
  UserNotFound: ErrorMetadata;
}

export const UserError: UserErrors = {
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
