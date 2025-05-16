import { Status } from "@core/errors/status.codes";
import { ErrorMetadata } from "@backend/common/types/error.types";

interface SocketErrors {
  InvalidSocketId: ErrorMetadata;
  ServerNotReady: ErrorMetadata;
}

export const SocketError: SocketErrors = {
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
