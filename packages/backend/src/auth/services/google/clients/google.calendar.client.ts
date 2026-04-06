import { GaxiosError, type GaxiosResponse } from "gaxios";
import { type WithId } from "mongodb";
import { calendar } from "@googleapis/calendar";
import { Status } from "@core/errors/status.codes";
import { Logger } from "@core/logger/winston.logger";
import { type gCalendar } from "@core/types/gcal";
import { type Schema_User } from "@core/types/user.types";
import { error } from "@backend/common/errors/handlers/error.handler";
import { UserError } from "@backend/common/errors/user/user.errors";
import { findCompassUserBy } from "@backend/user/queries/user.queries";
import GoogleOAuthClient from "./google.oauth.client";

const logger = Logger("app:google.calendar.service");

export const getGAuthClientForUser = async (
  user: WithId<Schema_User> | { _id: string },
) => {
  const googleOAuthClient = new GoogleOAuthClient();

  let gRefreshToken: string | undefined;
  if ("google" in user && user.google) {
    gRefreshToken = user.google.gRefreshToken;
  }

  if (!gRefreshToken) {
    const userId =
      "_id" in user
        ? typeof user._id === "string"
          ? user._id
          : user._id.toString()
        : undefined;

    if (!userId) {
      logger.error("Expected to either get a user or a userId.");
      throw error(UserError.InvalidValue, "User id is required");
    }

    const existingUser = await findCompassUserBy("_id", userId);

    if (!existingUser) {
      logger.error(`Couldn't find user with this id: ${userId}`);
      throw error(UserError.UserNotFound, "User not found");
    }

    if (!existingUser.google?.gRefreshToken) {
      throw error(
        UserError.MissingGoogleRefreshToken,
        "User has not connected Google Calendar",
      );
    }

    gRefreshToken = existingUser.google.gRefreshToken;
  }

  googleOAuthClient.oauthClient.setCredentials({
    refresh_token: gRefreshToken,
  });

  return googleOAuthClient;
};

export const getGcalClient = async (userId: string): Promise<gCalendar> => {
  const user = await findCompassUserBy("_id", userId);

  if (!user) {
    logger.error(`getGcalClient: Couldn't find user with this id: ${userId}`);

    const gaxiosErr = new GaxiosError(
      "invalid_grant",
      {
        headers: new Headers(),
        url: new URL("https://www.googleapis.com/calendar/v3"),
      },
      {
        status: Status.BAD_REQUEST,
        data: { userId },
        config: {
          headers: new Headers(),
          url: new URL("https://www.googleapis.com/calendar/v3"),
        },
        statusText: "BAD_REQUEST Cannot initialize Gcal client",
        headers: new Headers(),
      } as GaxiosResponse<{ userId: string }>,
    );
    gaxiosErr.code = "400";
    throw gaxiosErr;
  }

  if (!user.google?.gRefreshToken) {
    throw error(
      UserError.MissingGoogleRefreshToken,
      "User has not connected Google Calendar",
    );
  }

  const googleOAuthClient = await getGAuthClientForUser(user);

  return calendar({
    version: "v3",
    auth: googleOAuthClient.oauthClient,
  });
};
