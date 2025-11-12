import { session } from "@web/common/classes/Session";

interface AccessTokenPayload {
  sub: string;
  email?: string;
}

export const getUserId = async () => {
  const accessTokenPayload =
    (await session.getAccessTokenPayloadSecurely()) as AccessTokenPayload;
  const userId = accessTokenPayload["sub"];
  return userId;
};

/**
 * Get the user's email from the session access token payload
 */
export const getUserEmail = async (): Promise<string | null> => {
  try {
    const accessTokenPayload =
      (await session.getAccessTokenPayloadSecurely()) as AccessTokenPayload;
    return accessTokenPayload.email || null;
  } catch (error) {
    console.error("Failed to get user email:", error);
    return null;
  }
};
