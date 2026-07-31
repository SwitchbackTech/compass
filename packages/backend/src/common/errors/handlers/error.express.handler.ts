import { type Request } from "express";
import { type GaxiosError } from "gaxios";
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
  isGoogleError,
  isInvalidGoogleToken,
  isInvalidValue,
} from "@backend/common/services/gcal/gcal.utils";
import { pruneGoogleDataAndNotifyRevoked } from "@backend/common/services/gcal/google-revoked.util";
import {
  type CompassError,
  type Info_Error,
} from "@backend/common/types/error.types";
import { type SessionResponse } from "@backend/common/types/express.types";
import {
  EventMutationException,
  toEventMutationError,
} from "@backend/event/event.error";

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

  logger.error(e);

  return null;
};

export const handleExpressError = async (
  req: Request | SessionRequest,
  res: SessionResponse,
  e: CompassError,
) => {
  res.header("Content-Type", "application/json");

  const sessionUserId =
    typeof (req as SessionRequest).session?.getUserId === "function"
      ? (req as SessionRequest).session?.getUserId()
      : undefined;
  const statusHint =
    e instanceof BaseError
      ? e.statusCode
      : e instanceof EventMutationException
        ? toEventMutationError(e).status
        : typeof e.status === "number"
          ? e.status
          : undefined;

  const correlationHeader = req.headers?.["x-correlation-id"];
  errorHandler.log(e, {
    method: req.method,
    path: req.originalUrl ?? req.url,
    status: statusHint,
    userId: sessionUserId ?? null,
    correlationId:
      typeof correlationHeader === "string" ? correlationHeader : undefined,
  });
  // Typed mutation/cutover errors must keep the EventMutationError envelope
  // (`code`/`message`/`retryable`), not the generic `{ result, message }` shape.
  if (e instanceof EventMutationException) {
    const { status, body } = toEventMutationError(e);
    res.status(status).json(body);
  } else if (e instanceof BaseError) {
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
      message:
        "Google Calendar access expired or was revoked. Reconnect Google Calendar in Compass to resume syncing.",
    });
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

  // Neither branch above matched: without a fallback the request hangs
  // until the caller's own timeout, since the caller (handleExpressError)
  // awaits this and sends nothing itself for the Google-error path. Log
  // message/stack only, never `e` itself: a GaxiosError's `config`/`response`
  // (request headers, bearer token) are own enumerable properties the logger
  // would otherwise serialize straight into the log output.
  logger.error(`${userId} (user) hit an unhandled Google API error`, {
    message: e.message,
    stack: e.stack,
  });
  res.status(Status.INTERNAL_SERVER).send({
    error: "Unexpected error communicating with Google Calendar",
  });
};
