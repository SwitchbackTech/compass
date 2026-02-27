import { IDSchema } from "@core/types/type.utils";
import { error } from "@backend/common/errors/handlers/error.handler";
import { UserError } from "@backend/common/errors/user/user.errors";
import { findCompassUserBy } from "@backend/user/queries/user.queries";

export const requireGoogleConnection = async (
  userId: string,
): Promise<void> => {
  if (!IDSchema.safeParse(userId).success) {
    throw error(UserError.InvalidValue, "Invalid user id");
  }
  const user = await findCompassUserBy("_id", userId);
  if (!user) {
    throw error(UserError.UserNotFound, "User not found");
  }
  if (!user.google?.gRefreshToken) {
    throw error(
      UserError.MissingGoogleRefreshToken,
      "User has not connected Google Calendar",
    );
  }
};
