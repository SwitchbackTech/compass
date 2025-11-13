import { Credentials, TokenPayload } from "google-auth-library";
import supertokens from "supertokens-node";
import Session from "supertokens-node/recipe/session";
import { Logger } from "@core/logger/winston.logger";
import { error } from "@backend/common/errors/handlers/error.handler";
import { SyncError } from "@backend/common/errors/sync/sync.errors";
import { getSync } from "@backend/sync/util/sync.queries";
import { canDoIncrementalSync } from "@backend/sync/util/sync.util";
import {
  findCompassUserBy,
  updateGoogleRefreshToken,
} from "@backend/user/queries/user.queries";
import {
  StringV4Schema,
  zObjectId,
} from "../../../../core/src/types/type.utils";
import syncService from "../../sync/services/sync.service";
import userService from "../../user/services/user.service";
import GoogleAuthService from "./google.auth.service";

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

  createSessionForUser = async (cUserId: string) => {
    const userId = cUserId;
    const sUserId = supertokens.convertToRecipeUserId(cUserId);

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

  async googleSignup(
    gUser: TokenPayload,
    refreshToken: string,
    superTokensUserId: string,
  ) {
    const { userId } = await userService.initUserData(gUser, refreshToken);

    await supertokens.createUserIdMapping({
      superTokensUserId,
      externalUserId: userId,
      externalUserIdInfo: "Compass User ID",
    });

    await userService.updateUserMetadata({
      userId,
      data: { skipOnboarding: false },
    });

    return { cUserId: userId };
  }

  async googleSignin(
    gUser: TokenPayload,
    oAuthTokens: Pick<Credentials, "refresh_token" | "access_token">,
    superTokensUserId: string,
  ) {
    const user = await findCompassUserBy(
      "google.googleId",
      StringV4Schema.parse(gUser.sub),
    );

    const userId = zObjectId.parse(user?._id).toString();

    const gAuthClient = new GoogleAuthService();

    gAuthClient.oauthClient.setCredentials(oAuthTokens);

    const gcal = gAuthClient.getGcalClient();

    const refreshToken = StringV4Schema.parse(oAuthTokens.refresh_token);

    if (refreshToken !== user?.google.gRefreshToken) {
      await updateGoogleRefreshToken(userId, refreshToken);
    }

    try {
      await syncService.importIncremental(userId, gcal);
    } catch (e) {
      if (
        e instanceof Error &&
        e.message === SyncError.NoSyncToken.description
      ) {
        logger.info(
          `Resyncing google data due to missing sync for user: ${userId}`,
        );

        userService.restartGoogleCalendarSync(userId);
      }
    }

    await userService.saveTimeFor("lastLoggedInAt", userId);

    const id = await supertokens.getUserIdMapping({ userId });

    // for existing users without mapping
    // @TODO: run this in a migration script later - create issue
    if (id.status === "UNKNOWN_MAPPING_ERROR") {
      await supertokens.createUserIdMapping({
        superTokensUserId,
        externalUserId: userId,
        externalUserIdInfo: "Compass User ID",
        force: true,
      });
    }

    return { cUserId: userId };
  }
}

export default new CompassAuthService();
