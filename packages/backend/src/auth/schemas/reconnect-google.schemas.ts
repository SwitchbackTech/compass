import { type Credentials, type TokenPayload } from "google-auth-library";
import { StringV4Schema, zObjectId } from "@core/types/type.utils";

export type ParsedReconnectGoogleParams = {
  cUserId: string;
  gUser: TokenPayload;
  refreshToken: string;
};

export function parseReconnectGoogleParams(
  compassUserId: string,
  gUser: TokenPayload,
  oAuthTokens: Pick<Credentials, "refresh_token" | "access_token">,
): ParsedReconnectGoogleParams {
  const cUserId = zObjectId
    .parse(compassUserId, { error: () => "Invalid credentials" })
    .toString();
  StringV4Schema.parse(gUser.sub, { error: () => "Invalid Google user ID" });
  const refreshToken = StringV4Schema.parse(oAuthTokens.refresh_token, {
    error: () => "Invalid or missing Google refresh token",
  });
  return { cUserId, gUser, refreshToken };
}
