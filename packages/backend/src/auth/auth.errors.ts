import { BaseError } from "@core/errors/errors.base";
import { Status } from "@core/errors/status.codes";

export enum AuthError {
  MISSING_REFRESH_TOKEN = "Missing Refresh Token",
}

const AuthErrors = {
  [AuthError.MISSING_REFRESH_TOKEN]: {
    description: "No refresh token",
    status: Status.BAD_REQUEST,
    isOperational: true,
  },
};

export const _throw = (cause: AuthError, result: string) => {
  const err = AuthErrors[cause];
  throw new BaseError(result, err.description, err.status, err.isOperational);
};
