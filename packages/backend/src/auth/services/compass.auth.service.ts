import Session from "supertokens-node/recipe/session";
import { SyncError } from "@backend/common/constants/error.constants";
import { error } from "@backend/common/errors/handlers/error.handler";
import { getSync } from "@backend/sync/util/sync.queries";
import { canDoIncrementalSync } from "@backend/sync/util/sync.util";
import { findCompassUserBy } from "@backend/user/queries/user.queries";

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

  revokeSessionsByUser = async (userId: string) => {
    const sessionsRevoked = await Session.revokeAllSessionsForUser(userId);
    return { sessionsRevoked: sessionsRevoked.length };
  };
}

export default new CompassAuthService();
