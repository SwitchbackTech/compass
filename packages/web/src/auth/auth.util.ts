import Session from "supertokens-auth-react/recipe/session";

interface AccessTokenPayload {
  sub: string;
}

export const getUserId = async () => {
  const accessTokenPayload =
    (await Session.getAccessTokenPayloadSecurely()) as AccessTokenPayload;
  const userId = accessTokenPayload["sub"];
  return userId;
};
