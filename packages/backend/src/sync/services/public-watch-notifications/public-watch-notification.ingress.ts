import { type NextFunction, type Request, type Response } from "express";
import { ZodError } from "zod/v4";
import { Status } from "@core/errors/status.codes";
import {
  GcalNotificationSchema,
  type Payload_Sync_Notif,
} from "@core/types/sync.types";
import { error } from "@backend/common/errors/handlers/error.handler";
import { GcalError } from "@backend/common/errors/integration/gcal/gcal.errors";
import { decodeChannelToken } from "@backend/sync/services/watch/google-watch-token";
import { type IncomingHttpHeaders } from "node:http";

type PublicWatchNotificationLocals = {
  publicWatchNotification?: Payload_Sync_Notif;
};

const GOOGLE_NOTIFICATION_HEADERS = [
  "x-goog-channel-id",
  "x-goog-channel-token",
  "x-goog-resource-id",
  "x-goog-resource-state",
  "x-goog-channel-expiration",
];

const getHeader = (
  headers: IncomingHttpHeaders,
  name: string,
): string | undefined => {
  const value = headers[name];

  if (Array.isArray(value)) return value[0];

  return value;
};

export const hasPublicWatchNotificationHeaders = (
  headers: IncomingHttpHeaders,
) => {
  return GOOGLE_NOTIFICATION_HEADERS.every((header) =>
    Boolean(getHeader(headers, header)),
  );
};

export const parsePublicWatchNotification = (
  headers: IncomingHttpHeaders,
): Payload_Sync_Notif | undefined => {
  if (!hasPublicWatchNotificationHeaders(headers)) {
    return undefined;
  }

  const token = getHeader(headers, "x-goog-channel-token");
  const decoded = token ? decodeChannelToken(token) : undefined;

  if (!decoded) {
    return undefined;
  }

  return GcalNotificationSchema.parse({
    resource: decoded.resource,
    channelId: getHeader(headers, "x-goog-channel-id"),
    resourceId: getHeader(headers, "x-goog-resource-id"),
    resourceState: getHeader(headers, "x-goog-resource-state"),
    expiration: new Date(getHeader(headers, "x-goog-channel-expiration") ?? ""),
  });
};

const getLocals = (res: Response): PublicWatchNotificationLocals =>
  res.locals as PublicWatchNotificationLocals;

const verify = (req: Request, res: Response, next: NextFunction) => {
  try {
    const notification = parsePublicWatchNotification(req.headers);

    if (!notification) {
      res.status(Status.FORBIDDEN).send({
        error: error(GcalError.Unauthorized, "Notification Failed"),
      });
      return;
    }

    getLocals(res).publicWatchNotification = notification;

    next();
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(Status.FORBIDDEN).send("Invalid notification payload");
      return;
    }

    next(err);
  }
};

const getNotification = (res: Response): Payload_Sync_Notif => {
  const notification = getLocals(res).publicWatchNotification;

  if (!notification) {
    throw error(GcalError.Unauthorized, "Notification Failed");
  }

  return notification;
};

export const publicWatchNotificationIngress = {
  getNotification,
  verify,
};
