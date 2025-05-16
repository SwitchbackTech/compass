import { Status } from "@core/errors/status.codes";
import { ErrorMetadata } from "@backend/common/types/error.types";

interface EmailerErrorMap {
  InvalidTagId: ErrorMetadata;
  InvalidSecret: ErrorMetadata;
  InvalidSubscriberData: ErrorMetadata;
}

export const EmailerError: EmailerErrorMap = {
  InvalidSubscriberData: {
    description: "Subscriber data is missing or incorrect",
    status: Status.BAD_REQUEST,
    isOperational: true,
  },
  InvalidSecret: {
    description:
      "Invalid emailer API secret. Please make sure environment variables beginning with EMAILER_ are correct",
    status: Status.INTERNAL_SERVER,
    isOperational: true,
  },
  InvalidTagId: {
    description:
      "Invalid emailer tag id. Please make sure environment variables beginning with EMAILER_ are correct",
    status: Status.INTERNAL_SERVER,
    isOperational: true,
  },
};
