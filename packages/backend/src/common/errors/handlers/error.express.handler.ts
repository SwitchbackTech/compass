import { type Request } from "express";
import { GaxiosError } from "gaxios";
import { type SessionRequest } from "supertokens-node/framework/express";
import { BaseError } from "@core/errors/errors.base";
import { Status } from "@core/errors/status.codes";
import { Logger } from "@core/logger/winston.logger";
import { IS_DEV } from "@backend/common/constants/config.constants";
import {
  errorHandler,
  toClientErrorPayload,
} from "@backend/common/errors/handlers/error.handler";
import { UserError } from "@backend/common/errors/user/user.errors";
import {
  getEmailFromUrl,
  isFullSyncRequired,
  isGoogleError,
  isInvalidGoogleToken,
  isInvalidValue,
} from "@backend/common/services/gcal/gcal.utils";
import {
  type CompassError,
  type Info_Error,
} from "@backend/common/types/error.types";
import { type SessionResponse } from "@backend/common/types/express.types";
import { pruneGoogleDataAndNotifyRevoked } from "@backend/sync/services/google-sync/google-sync.revoked";
import { googleCalendarSyncService } from "@backend/sync/services/google-sync/google-sync.service";
import { getSyncByToken } from "@backend/sync/services/records/sync-records.repository";
import { findCompassUserBy } from "@backend/user/queries/user.queries";

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
      const syncToken = e.config.params.syncToken as string;
      const sync = await getSyncByToken(syncToken);

      if (sync) {
        return sync.user;
      }

      if (e.config.url) {
        const email = getEmailFromUrl(e.config.url.toString());
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
  req: Request | SessionRequest,
  res: SessionResponse,
  e: CompassError,
) => {
  res.header("Content-Type", "application/json");

  errorHandler.log(e);
  if (e instanceof BaseError) {
    res.status(e.statusCode).json(toClientErrorPayload(e));
  } else {
    const userId = await parseUserId(res, e);
    if (!userId) {
      logger.error(
        "Express error occurred, but couldn't handle due to missing userId",
      );
      res.status(Status.BAD_REQUEST).send(UserError.MissingUserIdField);
      return;
    }

    if (isGoogleError(e)) {
      await handleGoogleError(req, res, userId, e as GaxiosError);
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
  _req: Request | SessionRequest,
  res: SessionResponse,
  userId: string,
  e: GaxiosError,
) => {
  if (isInvalidGoogleToken(e)) {
    await pruneGoogleDataAndNotifyRevoked(userId, "invalid google token");

    res.status(Status.UNAUTHORIZED).send({
      code: "GOOGLE_REVOKED",
      message: "Google access revoked. Your Google data has been removed.",
    });
    return;
  }

  if (isFullSyncRequired(e)) {
    googleCalendarSyncService.repairGoogleCalendarSync(userId).catch((err) => {
      logger.error(
        `Something went wrong with resyncing google calendars for user: ${userId}`,
        err,
      );
    });

    res.status(Status.BAD_REQUEST).send({ message: "Full sync in progress." });

    return;
  }

  if (isInvalidValue(e)) {
    logger.error(
      `${userId} (user) has an invalid value. Check params:\n`,
      e.config.params,
    );

    res.status(Status.BAD_REQUEST).send({ error: UserError.InvalidValue });
    return;
  }
};
