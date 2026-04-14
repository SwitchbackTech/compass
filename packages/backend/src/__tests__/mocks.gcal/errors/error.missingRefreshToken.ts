import { BaseError } from "@core/errors/errors.base";
import { UserError } from "@backend/common/errors/user/user.errors";

export const missingRefreshTokenError = new BaseError(
  "MissingGoogleRefreshToken",
  UserError.MissingGoogleRefreshToken.description,
  UserError.MissingGoogleRefreshToken.status,
  UserError.MissingGoogleRefreshToken.isOperational,
);
