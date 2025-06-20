import axios from "axios";
import { getApiBaseUrl, log } from "@scripts/common/cli.utils";

/**
 * Creates a session and returns the access token.
 *
 * @param email - The email address to create a session for
 * @returns A promise that resolves with the access token string
 */
export async function createSession(email: string): Promise<string> {
  try {
    const baseUrl = await getApiBaseUrl("local");
    const response = await axios.post(
      `${baseUrl}/auth/session`,
      { email },
      {
        headers: {
          rid: "session",
          "st-auth-mode": "cookie",
          "Content-Type": "application/json",
        },
        withCredentials: true,
        validateStatus: () => true,
      },
    );

    const setCookie: string[] | undefined = response.headers["set-cookie"];
    if (!setCookie) {
      throw new Error("No set-cookie header found in response");
    }

    const accessTokenCookie = setCookie.find((cookie) =>
      cookie.startsWith("sAccessToken="),
    );
    if (!accessTokenCookie) {
      throw new Error("No sAccessToken cookie found in set-cookie header");
    }

    const match = accessTokenCookie.match(/^sAccessToken=([^;]+)/);
    if (!match) {
      throw new Error("Could not extract access token from cookie");
    }

    log.info(`Session created successfully.`);
    return match[1] as string;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error(
        "Failed to create session:",
        error.response?.data || error.message,
      );
      throw new Error(error.response?.data?.error || error.message);
    }
    throw error;
  }
}
