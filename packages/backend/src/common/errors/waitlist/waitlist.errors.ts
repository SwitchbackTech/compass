import { Status } from "@core/errors/status.codes";
import { ErrorMetadata } from "@backend/common/types/error.types";

interface WaitlistErrors {
  DuplicateEmail: ErrorMetadata;
  NotOnWaitlist: ErrorMetadata;
}

export const WaitlistError: WaitlistErrors = {
  DuplicateEmail: {
    description: "Email is already on waitlist",
    status: Status.BAD_REQUEST,
    isOperational: true,
  },
  NotOnWaitlist: {
    description: "Email is not on waitlist",
    status: Status.NOT_FOUND,
    isOperational: true,
  },
};
