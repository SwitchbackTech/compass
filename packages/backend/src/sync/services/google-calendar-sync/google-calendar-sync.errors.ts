import { BaseError } from "@core/errors/errors.base";
import { UserError } from "@backend/common/errors/user/user.errors";

export const isMissingGoogleRefreshToken = (
  error: unknown,
): error is BaseError => {
  return (
    error instanceof BaseError &&
    error.description === UserError.MissingGoogleRefreshToken.description
  );
};
