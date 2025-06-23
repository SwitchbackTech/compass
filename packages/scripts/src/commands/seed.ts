import axios from "axios";
import dayjs from "dayjs";
import pkg from "inquirer";
import { ObjectId } from "mongodb";
import { getApiBaseUrl, log } from "@scripts/common/cli.utils";
import { Schema_Event } from "@core/types/event.types";
import { FORMAT } from "@core/util/date/date.util";
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

    // Creates a variety of events for seeding

    // Get current month's start and end dates
    const now = dayjs();
    const monthStart = now.startOf("month").format(FORMAT.RFC3339_OFFSET.value);
    const monthEnd = now.endOf("month").format(FORMAT.RFC3339_OFFSET.value);

    // Get current week's start and end dates
    const weekStart = now.startOf("week").format(FORMAT.RFC3339_OFFSET.value);
    const weekEnd = now.endOf("week").format(FORMAT.RFC3339_OFFSET.value);

    // Create 8 monthly someday events
    const monthlyEvents = [];
    for (let i = 0; i < 8; i++) {
      const monthlyEvent = createMockStandaloneEvent({
        user: userId,
        isSomeday: true,
        startDate: monthStart,
        endDate: monthEnd,
      });
      monthlyEvents.push(monthlyEvent);
    }

    // Create 8 weekly someday events
    const weeklyEvents = [];
    for (let i = 0; i < 8; i++) {
      const weeklyEvent = createMockStandaloneEvent({
        user: userId,
        isSomeday: true,
        startDate: weekStart,
        endDate: weekEnd,
      });
      weeklyEvents.push(weeklyEvent);
    }

    // Create 2 all-day events for the week
    const allDayEvents: Schema_Event[] = [];
    // const weekStartDay = dayjs(weekStart).add(1, "day");

    const fourDayEvent = createMockStandaloneEvent({
      user: userId,
      title: "🏕️ UX Conference",
      description: "A special conference lasting four days",
      isAllDay: true,
      isSomeday: false,
      startDate: weekStart,
      endDate: dayjs(weekStart)
        .add(4, "day")
        .format(FORMAT.RFC3339_OFFSET.value),
    });
    allDayEvents.push(fourDayEvent);
    const oneDayEvent = createMockStandaloneEvent({
      user: userId,
      title: "🍿 State fair w/family",
      description: "A fun day at the state fair with family",
      isAllDay: true,
      isSomeday: false,
      startDate: dayjs(weekStart)
        .add(6, "day")
        .format(FORMAT.RFC3339_OFFSET.value),
      endDate: dayjs(weekStart)
        .add(7, "day")
        .format(FORMAT.RFC3339_OFFSET.value),
    });
    allDayEvents.push(oneDayEvent);

    const events: Schema_Event[] = [
      ...monthlyEvents,
      ...weeklyEvents,
      ...allDayEvents,
    ];

    await createEvent(events, baseUrl, accessToken);

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
