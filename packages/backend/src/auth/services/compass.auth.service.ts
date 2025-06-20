import supertokens from "supertokens-node";
import Session from "supertokens-node/recipe/session";
import { Logger } from "@core/logger/winston.logger";
import { error } from "@backend/common/errors/handlers/error.handler";
import { SyncError } from "@backend/common/errors/sync/sync.errors";
import { getSync } from "@backend/sync/util/sync.queries";
import { canDoIncrementalSync } from "@backend/sync/util/sync.util";
import { findCompassUserBy } from "@backend/user/queries/user.queries";

const logger = Logger("app:auth.service");

class CompassAuthService {
  determineAuthMethod = async (gUserId: string) => {
    const user = await findCompassUserBy("google.googleId", gUserId);

    if (!user) {
      return { authMethod: "signup", user: null };
    }
    const userId = user._id.toString();

    const sync = await getSync({ userId });
    if (!sync) {
      throw error(
        SyncError.NoSyncRecordForUser,
        "Did not verify sync record for user",
      );
    }

    const canLogin = canDoIncrementalSync(sync);
    const authMethod = user && canLogin ? "login" : "signup";

    return { authMethod, user };
  };

  createSessionForUser = async (cUserId?: string, email?: string) => {
    if (!cUserId && !email) {
      throw new Error("Either cUserId or email must be provided");
    }

    let userId: string;
    if (cUserId) {
      userId = cUserId;
    } else if (email) {
      const user = await findCompassUserBy("email", email);
      if (!user) {
        throw new Error("User doesn't exist");
      }
      userId = user._id.toString();
    } else {
      throw new Error("Unable to determine user ID");
    }

    const sUserId = supertokens.convertToRecipeUserId(userId);

    try {
      const session = await Session.createNewSessionWithoutRequestResponse(
        "public",
        sUserId,
      );
      const accessToken = session.getAccessToken();
      logger.info(`user session created for ${userId}`);
      return {
        sessionHandle: session.getHandle(),
        userId: sUserId,
        compassUserId: userId,
        accessToken,
      };
    } catch (err) {
      logger.error("Error creating session:", err);
      throw new Error("Failed to create session");
    }
  };

  revokeSessionsByUser = async (userId: string) => {
    const sessionsRevoked = await Session.revokeAllSessionsForUser(userId);
    return { sessionsRevoked: sessionsRevoked.length };
  };
}

export default new CompassAuthService();
