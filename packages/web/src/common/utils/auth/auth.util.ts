import { session } from "@web/common/classes/Session";

/**
 * Check if the user is currently authenticated
 */
export const isUserAuthenticated = async (): Promise<boolean> => {
  try {
    return await session.doesSessionExist();
  } catch (error) {
    console.error("Error checking authentication status:", error);
    return false;
  }
};

/**
 * Get the user ID. Returns a placeholder ID if the user is not authenticated.
 */
export const getUserId = async (): Promise<string> => {
  try {
    const authenticated = await isUserAuthenticated();
    if (!authenticated) {
      return "local_user";
    }

    const accessTokenPayload =
      (await session.getAccessTokenPayloadSecurely()) as {
        sub: string;
      };
    return accessTokenPayload.sub;
  } catch (error) {
    console.error("Error getting user ID:", error);
    return "local_user";
  }
};
