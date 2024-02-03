import { GaxiosError } from "googleapis-common";
import { BaseError } from "@core/errors/errors.base";
import { Status } from "@core/errors/status.codes";
import { Logger } from "@core/logger/winston.logger";
import { IS_DEV } from "@backend/common/constants/env.constants";
import { UserError } from "@backend/common/constants/error.constants";
import { CompassError, Info_Error } from "@backend/common/types/error.types";
import { SessionResponse } from "@backend/common/types/express.types";
import {
  isInvalidGoogleToken,
  isFullSyncRequired,
  isGoogleError,
  isInvalidValue,
  getEmailFromUrl,
} from "@backend/common/services/gcal/gcal.utils";
import compassAuthService from "@backend/auth/services/compass.auth.service";
import { getSyncByToken } from "@backend/sync/util/sync.queries";
import userService from "@backend/user/services/user.service";
import { findCompassUserBy } from "@backend/user/queries/user.queries";

import { errorHandler } from "./error.handler";

const logger = Logger("app:express.handler");

const assembleErrorInfo = (e: CompassError) => {
  const errInfo: Info_Error = {
    name: e.result,
    message: e.message,
    stack: undefined,
  };

  if (IS_DEV) {
    errInfo.stack = e.stack;
  }

  return errInfo;
};

const parseUserId = async (res: SessionResponse, e: Error) => {
  if (res.req?.session) {
    return res.req.session.getUserId();
  }

  if (e instanceof GaxiosError) {
    if ("syncToken" in e.config.params) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const syncToken = e.config.params.syncToken as string;
      const sync = await getSyncByToken(syncToken);

      if (sync) {
        return sync.user;
      }

      if (e.config.url) {
        const email = getEmailFromUrl(e.config.url);
        if (email) {
          const user = await findCompassUserBy("email", email);
          if (user) {
            return user._id.toString();
          }
        }
      }
    }
  }

  logger.error(e);

  return null;
};

export const handleExpressError = async (
  res: SessionResponse,
  e: CompassError
) => {
  res.header("Content-Type", "application/json");

  if (e instanceof BaseError) {
    errorHandler.log(e);
    res.status(e.statusCode).send(e);
  } else {
    const userId = await parseUserId(res, e);
    if (!userId) {
      logger.error(
        "Express error occured, but couldn't handle due to missing userId"
      );
      res.status(Status.BAD_REQUEST).send(UserError.MissingUserIdField);
      return;
    }

    if (isGoogleError(e)) {
      await handleGoogleError(userId, res, e as GaxiosError);
    } else {
      const errInfo = assembleErrorInfo(e);
      res.status(e.status || Status.INTERNAL_SERVER).send(errInfo);
    }
  }

  if (!errorHandler.isOperational(e)) {
    errorHandler.exitAfterProgrammerError();
  }
};

const handleGoogleError = async (
  userId: string,
  res: SessionResponse,
  e: GaxiosError
) => {
  if (isInvalidGoogleToken(e)) {
    const revokeResult = await compassAuthService.revokeSessionsByUser(userId);
    logger.debug(
      `Invalid Google token for user: ${userId}\n\t${revokeResult.sessionsRevoked} session(s) revoked as result`
    );
    res.status(Status.UNAUTHORIZED).send(revokeResult);
    return;
  }

  if (isFullSyncRequired(e)) {
    const result = await userService.reSyncGoogleData(userId);

    res.status(Status.OK).send(result);
    return;
  }

  if (isInvalidValue(e)) {
    logger.error(
      `${userId} (user) has an invalid value. Check params:\n`,
      e.config.params
    );

    res.status(Status.BAD_REQUEST).send({ error: UserError.InvalidValue });
    return;
  }
};
