import { zBase64String } from "@core/types/type.utils";
import { ChannelToken, ChannelTokenSchema } from "@core/types/watch.types";
import { ENV } from "@backend/common/constants/env.constants";

export function encodeChannelToken(
  _channelData: Omit<ChannelToken, "token"> & { token?: string },
): string {
  const { token: _token, ...channelData } = _channelData;
  const notificationToken = _token ?? ENV.TOKEN_GCAL_NOTIFICATION;
  const _data = { token: notificationToken, ...channelData };
  const data = ChannelTokenSchema.parse(_data);
  const urlEncodeData = new URLSearchParams(data).toString();
  const token = Buffer.from(urlEncodeData).toString("base64");

  return token;
}

export function decodeChannelToken(_token: string): ChannelToken | undefined {
  try {
    const token = zBase64String.safeParse(_token);

    if (!token.success) return undefined;

    const decoded = Buffer.from(token.data, "base64").toString("utf-8");
    const params = new URLSearchParams(decoded);
    const _data = Object.fromEntries(params.entries());
    const { success, data } = ChannelTokenSchema.safeParse(_data);

    if (!success) return undefined;

    if (data.token !== ENV.TOKEN_GCAL_NOTIFICATION) return undefined;

    return data;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (_) {
    return undefined;
  }
}
