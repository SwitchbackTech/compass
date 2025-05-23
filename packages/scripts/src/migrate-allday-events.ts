/**
 * This script is meant to be ran once on a database.
 * It handles migrating all-day events start-end dates
 * to ISO 8601 format.
 * This fixes issues where filtering events by date returns
 * inconsistent results due to database having a mixture of
 * ISO 8601 and non-ISO 8601 dates.
 *
 * Run it using the below command, after it finishes, remove the script.
 *
 * `clear && NODE_ENV=development npx ts-node -r tsconfig-paths/register packages/scripts/src/migrate-allday-events.ts`
 *
 * You can also remove `luxon` since it was needed only for this script.
 */
import { DateTime } from "luxon";
import { WithId } from "mongodb";
import { Schema_User } from "@core/types/user.types";
import mongoService from "@backend/common/services/mongo.service";

// ANSI escape codes for coloring
const COLORS = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  gray: "\x1b[90m",
};

// Logging utilities
const log = {
  log: (msg: string) =>
    console.log(
      `${COLORS.gray}[LOG ${new Date().toISOString()}]${COLORS.reset} ${msg}`,
    ),
  info: (msg: string) =>
    console.log(
      `${COLORS.cyan}[INFO ${new Date().toISOString()}]${COLORS.reset} ${msg}`,
    ),
  warn: (msg: string) =>
    console.warn(
      `${COLORS.yellow}[WARN ${new Date().toISOString()}]${COLORS.reset} ${msg}`,
    ),
  error: (msg: string) =>
    console.error(
      `${COLORS.red}[ERROR ${new Date().toISOString()}]${COLORS.reset} ${msg}`,
    ),
  success: (msg: string) =>
    console.log(
      `${COLORS.green}[SUCCESS ${new Date().toISOString()}]${COLORS.reset} ${msg}`,
    ),
};

const migrateUserEvents = async (user: WithId<Schema_User>) => {
  log.log(`Migrating user: '${user._id}'`);

  const events = await mongoService.event
    .find({ user: user._id.toString() })
    .toArray();
  const allDayEvents = events.filter((e) => e.isAllDay);

  if (allDayEvents.length === 0) {
    log.info(`User '${user._id}' has no all-day events. No migration needed.`);
    return;
  }

  let timezone: string;

  // Determine timezone based on first timed event
  const timedEvent = events.find((e) => !e.isAllDay && !e.isSomeday);
  if (timedEvent) {
    const start = DateTime.fromISO(timedEvent.startDate, { setZone: true });
    timezone = start.zoneName;
    log.info(`Detected timezone: ${timezone}`);
  } else {
    timezone = "UTC-7";
    log.warn(`No timed events found. Using default timezone: ${timezone}`);
  }

  const toISOWithZone = (dateStr: string, midnight: boolean = false) => {
    const converted = DateTime.fromISO(dateStr, { zone: timezone });
    const date = midnight ? converted.endOf("day") : converted.startOf("day");
    return date.toISO({ suppressMilliseconds: true });
  };

  for (const event of allDayEvents) {
    const updatedEvent = {
      startDate: toISOWithZone(event.startDate as string),
      endDate: toISOWithZone(event.endDate as string, true),
    };

    await mongoService.event.updateOne(
      { _id: event._id },
      { $set: updatedEvent },
    );

    log.log(
      `Updated event '${event._id}' with ISO strings in zone ${timezone}`,
    );
  }
};

const main = async () => {
  await mongoService.waitUntilConnected();

  const users = await mongoService.user.find({}).toArray();
  for (const user of users) {
    await migrateUserEvents(user);
  }

  log.success("Done!");
  await mongoService.cleanup();
};

main();
