import { session } from "@web/common/classes/Session";
import { UNAUTHENTICATED_USER } from "@web/common/constants/auth.constants";

interface AccessTokenPayload {
  sub: string;
}

export const getUserId = async () => {
  const sessionExists = await session.doesSessionExist();

  if (!sessionExists) {
    return UNAUTHENTICATED_USER;
  }

  const accessTokenPayload =
    (await session.getAccessTokenPayloadSecurely()) as AccessTokenPayload;
  const userId = accessTokenPayload["sub"];
  return userId;
};
