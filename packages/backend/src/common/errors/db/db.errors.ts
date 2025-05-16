import { Status } from "@core/errors/status.codes";
import { ErrorMetadata } from "@backend/common/types/error.types";

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
