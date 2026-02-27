import { IDSchema } from "@core/types/type.utils";
import { error } from "@backend/common/errors/handlers/error.handler";
import { UserError } from "@backend/common/errors/user/user.errors";
import { findCompassUserBy } from "@backend/user/queries/user.queries";

export const isGoogleConnected = async (userId: string): Promise<boolean> => {
  const user = await findCompassUserBy("_id", userId);
  return !!user?.google?.gRefreshToken;
};

export const requireGoogleConnection = async (
  userId: string,
): Promise<void> => {
  if (!IDSchema.safeParse(userId).success) {
    throw error(UserError.InvalidValue, "Invalid user id");
  }
  if (!(await isGoogleConnected(userId))) {
    throw error(
      UserError.MissingGoogleRefreshToken,
      "User has not connected Google Calendar",
    );
  }
};
