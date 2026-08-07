import { type Request } from "express";
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

const statusHintFromError = (e: CompassError): number | undefined => {
  if (e instanceof BaseError) return e.statusCode;
  if (e instanceof EventMutationException)
    return toEventMutationError(e).status;
  if (typeof e.status === "number") return e.status;
  return undefined;
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
  const correlationHeader = req.headers?.["x-correlation-id"];
  errorHandler.log(e, {
    method: req.method,
    path: req.originalUrl ?? req.url,
    status: statusHintFromError(e),
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

    const errInfo = assembleErrorInfo(e);
    res.status(e.status || Status.INTERNAL_SERVER).send(errInfo);
  }

  if (!errorHandler.isOperational(e)) {
    errorHandler.exitAfterProgrammerError();
  }
};
