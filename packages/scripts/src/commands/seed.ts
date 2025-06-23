import axios from "axios";
import dayjs from "dayjs";
import pkg from "inquirer";
import { ObjectId } from "mongodb";
import eventTemplates from "@scripts/common/cli.event.templates";
import { getApiBaseUrl, log } from "@scripts/common/cli.utils";
import { Schema_Event } from "@core/types/event.types";
import { createMockStandaloneEvent } from "@core/util/test/ccal.event.factory";
import compassAuthService from "@backend/auth/services/compass.auth.service";
import mongoService from "@backend/common/services/mongo.service";
import { findCompassUserBy } from "@backend/user/queries/user.queries";

const { prompt } = pkg;

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

    // Get current time
    const now = dayjs();

    // Create events from templates
    const events: Schema_Event[] = eventTemplates.flatMap((template) => {
      const event = {
        user: userId,
        isSomeday: template.isSomeday,
        isAllDay: template.isAllDay,
        startDate: template.start(now),
        endDate: template.end(now),
        ...(template.title && { title: template.title }),
        ...(template.description && { description: template.description }),
        ...(template.recurrence && { recurrence: template.recurrence }),
      };

      return Array(template.count)
        .fill(null)
        .map(() => createMockStandaloneEvent(event));
    });

    // Calls Event.Controller
    await axios.post(`${baseUrl}/event`, events, {
      headers: { Cookie: `sAccessToken=${accessToken}` },
    });

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
        seedEvents(userInput).catch((e: Error) => console.log(e));
      } else {
        log.info("Operation cancelled. No events were created.");
        process.exit(0);
      }
    })
    .catch((err: Error) => console.log(err));
}
