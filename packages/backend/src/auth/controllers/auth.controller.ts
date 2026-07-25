import { ObjectId } from "mongodb";
import { type SessionRequest } from "supertokens-node/framework/express";
import {
  type GoogleAuthCodeRequest,
  GoogleAuthCodeRequestSchema,
  GoogleConnectResponseSchema,
} from "@core/types/auth.types";
import {
  type ConnectionBeginRequest,
  ConnectionBeginRequestSchema,
} from "@core/types/sync/connection.contracts";
import { zObjectId } from "@core/types/type.utils";
import compassAuthService from "@backend/auth/services/compass/compass.auth.service";
import { googleAuthService } from "@backend/auth/services/google/google.auth.service";
import { CONFIG } from "@backend/common/constants/config.constants";
import { isGoogleConfigured } from "@backend/common/constants/config.util";
import { AuthError } from "@backend/common/errors/auth/auth.errors";
import { error } from "@backend/common/errors/handlers/error.handler";
import { assertCloudMutationsAllowed } from "@backend/common/services/sync-service/cloud-mutation-mode";
import { getConnectionDelegation } from "@backend/common/services/sync-service/connection-routing";
import { beginSyncConnection } from "@backend/common/services/sync-service/sync-connection-begin";
import { toSyncPrincipal } from "@backend/common/services/sync-service/sync-principal";
import { getSyncServiceClient } from "@backend/common/services/sync-service/sync-service.factory";
import {
  type ReqBody,
  type Res_Promise,
  type SReqBody,
} from "@backend/common/types/express.types";

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

  connectGoogle = (
    req: SReqBody<GoogleAuthCodeRequest>,
    res: Res_Promise,
  ): void => {
    try {
      assertCloudMutationsAllowed();
    } catch (err) {
      res.promise(Promise.reject(err));
      return;
    }

    if (!isGoogleConfigured(CONFIG)) {
      res.promise(
        Promise.reject(error(AuthError.GoogleNotConfigured, "Connect failed")),
      );
      return;
    }

    const userId = zObjectId.parse(req.session?.getUserId()).toString();
    const input = GoogleAuthCodeRequestSchema.parse(req.body);

    res.promise(
      googleAuthService
        .connectGoogleToCurrentUser(userId, input)
        .then(() => GoogleConnectResponseSchema.parse({ status: "OK" })),
    );
  };

  // Start a sync-delegated Google connection: return the provider consent URL
  // the browser should navigate to. Only applies where this deployment
  // delegates provider connections to the sync service (the redirect flow); the
  // legacy code-exchange flow uses connectGoogle above instead.
  beginGoogleConnection = (
    req: SReqBody<ConnectionBeginRequest>,
    res: Res_Promise,
  ): void => {
    try {
      assertCloudMutationsAllowed();
    } catch (err) {
      res.promise(Promise.reject(err));
      return;
    }

    const client =
      getConnectionDelegation() === "sync" ? getSyncServiceClient() : null;
    if (!client) {
      res.promise(
        Promise.reject(
          error(AuthError.ConnectNotDelegated, "Connect begin unavailable"),
        ),
      );
      return;
    }

    const userId = zObjectId.parse(req.session?.getUserId()).toString();
    const request = ConnectionBeginRequestSchema.parse(req.body ?? {});

    res.promise(beginSyncConnection(client, toSyncPrincipal(userId), request));
  };
}

export default new AuthController();
