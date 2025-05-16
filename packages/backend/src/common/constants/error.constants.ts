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
