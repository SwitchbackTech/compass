import { ObjectId } from "mongodb";
import { type SessionRequest } from "supertokens-node/framework/express";
import { Logger } from "@core/logger/winston.logger";
import {
  type ConnectionBeginRequest,
  ConnectionBeginRequestSchema,
} from "@core/types/sync/connection.contracts";
import { ConnectionIdSchema } from "@core/types/sync/identity.contracts";
import { zObjectId } from "@core/types/type.utils";
import compassAuthService from "@backend/auth/services/compass/compass.auth.service";
import { assertCloudMutationsAllowed } from "@backend/common/services/sync-service/cloud-mutation-mode";
import { beginSyncConnection } from "@backend/common/services/sync-service/sync-connection-begin";
import { toSyncPrincipal } from "@backend/common/services/sync-service/sync-principal";
import { getSyncServiceClient } from "@backend/common/services/sync-service/sync-service.factory";
import { unwrapSyncResult } from "@backend/common/services/sync-service/unwrap-sync-result";
import {
  type ReqBody,
  type Res_Promise,
  type SReqBody,
} from "@backend/common/types/express.types";
import { toEventMutationError } from "@backend/event/event.error";

const logger = Logger("app:auth.controller");

const rejectIfMaintenance = (res: Res_Promise): boolean => {
  try {
    assertCloudMutationsAllowed();
    return false;
  } catch (err) {
    const { status, body } = toEventMutationError(err);
    res.status(status).json(body);
    return true;
  }
};

class AuthController {
  createSession = async (
    req: ReqBody<{ cUserId: string }>,
    res: Res_Promise,
  ) => {
    const { cUserId } = req.body;

    if (!ObjectId.isValid(cUserId)) {
      res.promise({ error: "Invalid user ID" });
      return;
    }

    if (cUserId) {
      const sessionData =
        await compassAuthService.createSessionForUser(cUserId);

      res.promise({
        message: `User session created for ${cUserId}`,
        accessToken: sessionData.accessToken,
      });
    } else {
      res.promise({ error: "User doesn't exist" });
      return;
    }
  };

  getUserIdFromSession = (req: SessionRequest, res: Res_Promise) => {
    const userId = zObjectId.parse(req.session?.getUserId()).toString();

    res.promise({ userId });
  };

  // Start a Google connection: return the provider consent URL the browser
  // should navigate to.
  beginGoogleConnection = (
    req: SReqBody<ConnectionBeginRequest>,
    res: Res_Promise,
  ): void => {
    if (rejectIfMaintenance(res)) return;

    const client = getSyncServiceClient();
    const userId = zObjectId.parse(req.session?.getUserId()).toString();
    const request = ConnectionBeginRequestSchema.parse(req.body ?? {});

    res.promise(beginSyncConnection(client, toSyncPrincipal(userId), request));
  };

  // Disconnect one connected Google account, leaving the user's others (and
  // their Compass sign-in) alone. Sync scopes the disconnect to the signed
  // principal, so a connection id the caller does not own is rejected there.
  disconnectGoogleConnection = (
    req: SessionRequest,
    res: Res_Promise,
  ): void => {
    if (rejectIfMaintenance(res)) return;

    const client = getSyncServiceClient();
    const userId = zObjectId.parse(req.session?.getUserId()).toString();
    const connectionId = ConnectionIdSchema.parse(req.params["connectionId"]);

    res.promise(
      client
        .disconnectConnection(toSyncPrincipal(userId), connectionId)
        .then((result) =>
          unwrapSyncResult(result, {
            logger,
            logMessage: "Sync disconnect failed",
            userMessage: "Failed to disconnect Google account",
          }),
        )
        .then(() => ({ statusCode: 204 })),
    );
  };

  // User-triggered Google calendar catch-up (Refresh calendar CTA).
  refreshGoogleSync = (req: SessionRequest, res: Res_Promise): void => {
    if (rejectIfMaintenance(res)) return;

    const client = getSyncServiceClient();
    const userId = zObjectId.parse(req.session?.getUserId()).toString();

    res.promise(
      client.refreshConnection(toSyncPrincipal(userId)).then((result) =>
        unwrapSyncResult(result, {
          logger,
          logMessage: "Sync refresh failed",
          userMessage: "Failed to refresh Google Calendar",
        }),
      ),
    );
  };
}

export default new AuthController();
