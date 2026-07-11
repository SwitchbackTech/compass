import { confirm, input } from "@inquirer/prompts";
import { type MigrationContext } from "@scripts/common/cli.types";
import { ObjectId } from "mongodb";
import { type MigrationParams, type RunnableMigration } from "umzug";
import { NodeEnv, Priorities } from "@core/constants/core.constants";
import {
  type CalendarId,
  type DateTime,
  type EventId,
  type TimeZone,
} from "@core/types/domain-primitives";
import { type CreateEventInput } from "@core/types/event-command.contracts";
import dayjs from "@core/util/date/dayjs";
import calendarService from "@backend/calendar/services/calendar.service";
import { CONFIG } from "@backend/common/constants/config.constants";
import { error } from "@backend/common/errors/handlers/error.handler";
import { UserError } from "@backend/common/errors/user/user.errors";
import eventService from "@backend/event/services/event.service";
import { findCompassUserBy } from "@backend/user/queries/user.queries";

const SEEDED_EVENT_ID = "68dd107efa3e55e40e095199";

export default class Seeder implements RunnableMigration<MigrationContext> {
  readonly name: string = "2025.10.01T10.09.22.seed-user-events";
  readonly path: string = "2025.10.01T10.09.22.seed-user-events.ts";

  async #buildEvent(userId: string): Promise<CreateEventInput> {
    const calendar = await calendarService.getLocalCalendar(userId);

    if (!calendar) {
      throw error(
        UserError.InvalidValue,
        `No local calendar found for user: ${userId}`,
      );
    }

    const start = dayjs().hour(10).minute(0).second(0).millisecond(0);
    const end = start.add(1, "hour");

    return {
      id: SEEDED_EVENT_ID as EventId,
      calendarId: calendar._id.toHexString() as CalendarId,
      content: { kind: "details", title: "Seeded event", description: "" },
      schedule: {
        kind: "timed",
        start: start.toISOString() as DateTime,
        end: end.toISOString() as DateTime,
        timeZone: (calendar.timeZone ?? "UTC") as TimeZone,
      },
      recurrence: { kind: "single" },
      priority: Priorities.UNASSIGNED,
    };
  }

  async #prompt(
    params: MigrationParams<MigrationContext>,
    direction: "up" | "down",
  ) {
    const controller = new AbortController();
    const action = direction === "up" ? "Create" : "Delete";
    const process = direction === "up" ? "seeding" : "removing seeded";

    const skip = await confirm(
      {
        default: CONFIG.NODE_ENV !== NodeEnv.Development,
        theme: { prefix: "" },
        message: [
          "",
          `${process} user events`.toUpperCase(),
          "",
          "Skip this seeder?",
        ].join("\n"),
      },
      { signal: controller.signal, clearPromptOnDone: true },
    );

    if (skip) return { user: null, proceed: false };

    const user = await input(
      {
        theme: { prefix: "" },
        message: "\n",
        required: !skip,
        validate: ObjectId.isValid,
        transformer(input: string) {
          return [
            "",
            "⚠️  WARNING ⚠️",
            "",
            `This command will modify user's data as follows:`,
            `• ${action} an event in your Compass Calendar database`,
            "",
            "🔔 RECOMMENDATION:",
            "It's strongly recommended to use this command with a test account",
            "rather than your personal account to avoid cluttering your calendar.",
            "",
            `Enter your Compass user "_id" string: ${input}`,
          ].join("\n");
        },
      },
      { signal: controller.signal },
    );

    const proceed =
      params.context.unsafe ||
      (await confirm({
        theme: { prefix: "" },
        default: params.context.unsafe,
        message: [
          "",
          `Do you want to proceed with ${process} events for: >> ${user} <<`,
        ].join("\n"),
      }));

    if (proceed) {
      params.context.logger.debug(
        `Starting event ${process} process for user: ${user}...`,
      );
    } else {
      params.context.logger.debug(
        `Operation cancelled. No events were ${action.toLowerCase()}ed.`,
      );
    }

    return { user, proceed };
  }

  async #findUserOrThrow(userId: string) {
    const user = await findCompassUserBy("_id", userId);

    if (!user) {
      throw error(
        UserError.UserNotFound,
        `User not found with Compass ID: ${userId}`,
      );
    }

    return user;
  }

  async up(params: MigrationParams<MigrationContext>): Promise<void> {
    const { user, proceed } = await this.#prompt(params, "up");

    if (!proceed) return Promise.resolve();

    const userId = (await this.#findUserOrThrow(user!))._id.toString();
    const input = await this.#buildEvent(userId);

    await eventService.create(userId, input);

    params.context.logger.debug(`Seeded 1 event for user: ${userId}`);
  }

  async down(params: MigrationParams<MigrationContext>): Promise<void> {
    const { user, proceed } = await this.#prompt(params, "down");

    if (!proceed) return Promise.resolve();

    const userId = (await this.#findUserOrThrow(user!))._id.toString();

    await eventService
      .delete(userId, SEEDED_EVENT_ID, { scope: "all" })
      .catch(() => undefined);

    params.context.logger.debug(`Removed seeded event for user: ${userId}`);
  }
}
