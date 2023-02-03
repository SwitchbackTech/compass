import { Credentials } from "google-auth-library";
import GoogleAuthService from "@backend/auth/services/google.auth.service";
import { AuthError } from "@backend/common/constants/error.constants";
import { error } from "@backend/common/errors/handlers/error.handler";

export const initGoogleClient = async (
  gAuthClient: GoogleAuthService,
  tokens: Credentials
) => {
  const gRefreshToken = tokens.refresh_token;
  if (!gRefreshToken) {
    throw error(AuthError.MissingRefreshToken, "Failed to auth to user's gCal");
  }

  gAuthClient.oauthClient.setCredentials(tokens);

  const { gUser } = await gAuthClient.getGoogleUserInfo();

  const gcalClient = gAuthClient.getGcalClient();

  return { gUser, gcalClient, gRefreshToken };
};
