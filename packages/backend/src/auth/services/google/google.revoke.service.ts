import { Logger } from "@core/logger/winston.logger";

const logger = Logger("app:auth.google.revoke");

const GOOGLE_REVOKE_URL = "https://oauth2.googleapis.com/revoke";

/**
 * Revokes a user's Google OAuth grant, so Compass loses access to their
 * Google data for good.
 *
 * Never throws: this runs during account deletion, and a Google-side failure
 * must not strand the user with an undeleted account. Returns whether the
 * grant was revoked so callers can log/report it.
 */
export const revokeGoogleGrant = async (
  gRefreshToken: string,
): Promise<boolean> => {
  try {
    const response = await fetch(GOOGLE_REVOKE_URL, {
      body: new URLSearchParams({ token: gRefreshToken }),
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      method: "POST",
    });

    if (!response.ok) {
      logger.warn(
        `Google grant revoke failed with status ${response.status}; continuing anyway`,
      );
      return false;
    }

    return true;
  } catch (e) {
    logger.warn(
      `Google grant revoke errored, continuing anyway: ${(e as Error).message}`,
    );
    return false;
  }
};
