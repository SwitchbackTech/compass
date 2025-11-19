import { session } from "@web/common/classes/Session";

interface AccessTokenPayload {
  sub: string;
}

export const getUserId = async () => {
  const accessTokenPayload =
    (await session.getAccessTokenPayloadSecurely()) as AccessTokenPayload;
  const userId = accessTokenPayload["sub"];
  return userId;
};
