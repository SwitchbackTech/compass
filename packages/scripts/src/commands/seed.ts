import axios from "axios";
import dayjs from "dayjs";
import pkg from "inquirer";
import { ObjectId } from "mongodb";
import { getApiBaseUrl, log } from "@scripts/common/cli.utils";
import { Schema_Event } from "@core/types/event.types";
import { createMockStandaloneEvent } from "@core/util/test/ccal.event.factory";
import compassAuthService from "@backend/auth/services/compass.auth.service";
import mongoService from "@backend/common/services/mongo.service";
import { findCompassUserBy } from "@backend/user/queries/user.queries";

const { prompt } = pkg;

async function createEvent(
  events: Schema_Event[],
  baseUrl: string,
  accessToken: string,
) {
  await axios.post(`${baseUrl}/event`, events, {
    headers: { Cookie: `sAccessToken=${accessToken}` },
  });
}

async function seedEvents(userInput: string) {
  try {
    // Validate userInput as ObjectId
    if (!ObjectId.isValid(userInput)) {
      log.error(
        `Provided user id is not a valid ObjectId: ${userInput}.
        Please provide your Compass user's _id value.`,
      );
      process.exit(1);
    }

    // Connect to MongoDB
    await mongoService.waitUntilConnected();

    const user = await findCompassUserBy("_id", userInput);

    if (!user) {
      log.error(`User not found with Compass ID: ${userInput}`);
      process.exit(1);
    }

    const userId = user._id.toString();
    log.info(`Running seed command for user: ${userId} (${user.email})...`);

    // Creates user session
    const { accessToken } =
      await compassAuthService.createSessionForUser(userId);
    const baseUrl = await getApiBaseUrl("local");

    // Test Event
    const eventOverrides = {
      user: userId,
      isAllDay: false,
      isSomeday: false,
      startDate: dayjs().hour(10).minute(0).second(0).toISOString(),
      endDate: dayjs().hour(11).minute(0).second(0).toISOString(),
    };
    const event = createMockStandaloneEvent(eventOverrides);
    const events: Schema_Event[] = [event];

    await createEvent(events, baseUrl, accessToken);

    // TODO: Create a variety of events for seeding

    log.success(
      `Successfully created events for user: ${user.email} with id: ${userId}`,
    );
  } catch (error) {
    log.error("Failed to seed events:");
    console.error(error);
  }

  process.exit(0);
}

export async function runSeed(userInput: string, force = false) {
  log.info("Connecting to db...");
  await mongoService.waitUntilConnected();

  if (force === true) {
    await seedEvents(userInput);
    return;
  }

  const warning = [
    "⚠️  WARNING ⚠️",
    "",
    "This command will:",
    "• Create multiple events in your Compass Calendar database",
    "• Create multiple events in your primary Google Calendar",
    "",
    "🔔 RECOMMENDATION:",
    "It's strongly recommended to use this command with a test account",
    "rather than your personal account to avoid cluttering your calendar.",
  ].join("\n");

  log.warning(warning);

  const questions = [
    {
      type: "confirm",
      name: "proceed",
      message: `Do you want to proceed with seeding events for: >> ${userInput} <<`,
    },
  ];

  prompt(questions)
    .then((answer: { proceed: boolean }) => {
      if (answer.proceed) {
        log.info("Starting event seeding process...");
        seedEvents(userInput).catch((e) => console.log(e));
      } else {
        log.info("Operation cancelled. No events were created.");
        process.exit(0);
      }
    })
    .catch((err) => console.log(err));
}
