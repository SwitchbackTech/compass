import { zBase64String } from "@core/types/type.utils";
import { ChannelToken, ChannelTokenSchema } from "@core/types/watch.types";
import { ENV } from "@backend/common/constants/env.constants";
import { error } from "../../common/errors/handlers/error.handler";
import { GcalError } from "../../common/errors/integration/gcal/gcal.errors";

export function encodeChannelToken(
  channelData: Omit<ChannelToken, "token">,
): string {
  const notificationToken = ENV.TOKEN_GCAL_NOTIFICATION;
  const _data = { token: notificationToken, ...channelData };
  const data = ChannelTokenSchema.parse(_data);
  const urlEncodeData = new URLSearchParams(data).toString();
  const token = Buffer.from(urlEncodeData).toString("base64");

  return token;
}

export function decodeChannelToken(_token: string): ChannelToken {
  const token = zBase64String.parse(_token);
  const decoded = Buffer.from(token, "base64").toString("utf-8");
  const params = new URLSearchParams(decoded);
  const _data = Object.fromEntries(params.entries());
  const data = ChannelTokenSchema.parse(_data);

  if (data.token !== ENV.TOKEN_GCAL_NOTIFICATION) {
    throw error(GcalError.Unauthorized, "Invalid channel token");
  }

  return data;
}
