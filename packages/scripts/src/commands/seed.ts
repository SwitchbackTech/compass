import axios from "axios";
import pkg from "inquirer";
import { createSession } from "@scripts/common/cli.auth";
import { getApiBaseUrl, log } from "@scripts/common/cli.utils";
import { Origin, Priorities } from "@core/constants/core.constants";
import { Schema_Event } from "@core/types/event.types";
import mongoService from "@backend/common/services/mongo.service";
import { findCompassUserBy } from "@backend/user/queries/user.queries";

const { prompt } = pkg;

async function createEvent(events: Schema_Event[], email: string) {
  try {
    // Create session
    const accessToken = await createSession(email);
    const baseUrl = await getApiBaseUrl("local");
    const response = await axios.post(`${baseUrl}/event`, events, {
      headers: {
        "Content-Type": "application/json",
        Cookie: `sAccessToken=${accessToken}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error("Failed to create events:", error);
    throw error;
  }
}

async function seedEvents(userInput: string) {
  try {
    // Connect to MongoDB
    await mongoService.waitUntilConnected();

    // Determine if input is email or ID and get the user ID
    const isEmail = userInput.includes("@");
    const user = await findCompassUserBy(isEmail ? "email" : "_id", userInput);

    if (!user) {
      log.error(
        `User not found with ${isEmail ? "email" : "ID"}: ${userInput}`,
      );
      process.exit(1);
    }

    const userId = user._id.toString();
    log.info(`Running seed command for user: ${user.email}...`);

    // Create a test event
    const event: Schema_Event[] = [
      {
        title: "Test Event",
        description: "This is a test event created by the seed script",
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
        origin: Origin.COMPASS,
        priority: Priorities.UNASSIGNED,
        user: userId,
        isAllDay: false,
        isSomeday: false,
      },
    ];
    const createdEvents = await createEvent(event, user.email);
    console.log(createdEvents, "createdEvents");

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
    "• Create multiple events in your Compass calendar database",
    "• Create multiple events in your primary Google calendar",
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
