import { type Credentials, type TokenPayload } from "google-auth-library";
import { StringV4Schema, zObjectId } from "@core/types/type.utils";
import { type ParsedReconnectGoogleParams } from "./google.auth.types";

export function parseReconnectGoogleParams(
  compassUserId: string,
  gUser: TokenPayload,
  oAuthTokens: Pick<Credentials, "refresh_token" | "access_token">,
): ParsedReconnectGoogleParams {
  const cUserId = zObjectId.parse(compassUserId).toString();
  StringV4Schema.parse(gUser.sub);
  const refreshToken = StringV4Schema.parse(oAuthTokens.refresh_token);
  return { cUserId, gUser, refreshToken };
}
