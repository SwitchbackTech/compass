import { ObjectId } from "mongodb";
import { type SessionRequest } from "supertokens-node/framework/express";
import {
  type GoogleAuthCodeRequest,
  GoogleAuthCodeRequestSchema,
  GoogleConnectResponseSchema,
} from "@core/types/auth.types";
import { zObjectId } from "@core/types/type.utils";
import compassAuthService from "@backend/auth/services/compass/compass.auth.service";
import googleAuthService from "@backend/auth/services/google/google.auth.service";
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
    const userId = zObjectId.parse(req.session?.getUserId()).toString();
    const input = GoogleAuthCodeRequestSchema.parse(req.body);

    res.promise(
      googleAuthService
        .connectGoogleToCurrentUser(userId, input)
        .then(() => GoogleConnectResponseSchema.parse({ status: "OK" })),
    );
  };
}

export default new AuthController();
