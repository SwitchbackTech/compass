import { type ErrorMetadata } from "@backend/common/types/error.types";
import { Status } from "@core/errors/status.codes";

interface DbErrors {
  InvalidId: ErrorMetadata;
}
export const DbError: DbErrors = {
  InvalidId: {
    description: "id is invalid (according to Mongo)",
    status: Status.BAD_REQUEST,
    isOperational: true,
  },
};
