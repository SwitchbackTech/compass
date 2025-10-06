import { ObjectId } from "mongodb";
import type { MigrationParams, RunnableMigration } from "umzug";
import { confirm, input } from "@inquirer/prompts";
import { MigrationContext } from "@scripts/common/cli.types";
import { NodeEnv } from "@core/constants/core.constants";
import {
  CompassEventStatus,
  CompassThisEvent,
  RecurringEventUpdateScope,
} from "@core/types/event.types";
import dayjs from "@core/util/date/dayjs";
import { createMockStandaloneEvent } from "@core/util/test/ccal.event.factory";
import { ENV } from "@backend/common/constants/env.constants";
import { error } from "@backend/common/errors/handlers/error.handler";
import { UserError } from "@backend/common/errors/user/user.errors";
import { CompassSyncProcessor } from "@backend/sync/services/sync/compass.sync.processor";
import { findCompassUserBy } from "@backend/user/queries/user.queries";

export default class Seeder implements RunnableMigration<MigrationContext> {
  readonly name: string = "2025.10.01T10.09.22.seed-user-events";
  readonly path: string = "2025.10.01T10.09.22.seed-user-events.ts";

  #generateEvents(userId: string): Array<CompassThisEvent["payload"]> {
    const standalone = createMockStandaloneEvent({
      user: userId,
      isAllDay: false,
      isSomeday: false,
      startDate: dayjs().hour(10).minute(0).second(0).toISOString(),
    });

    return [
      {
        ...standalone,
        _id: "68dd107efa3e55e40e095199",
        user: standalone.user!,
        startDate: standalone.startDate!,
        endDate: standalone.endDate!,
        origin: standalone.origin!,
        priority: standalone.priority!,
      },
    ];
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
        default: ENV.NODE_ENV !== NodeEnv.Development,
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
            `• ${action} multiple events in your Compass Calendar database`,
            `• ${action} multiple events in your primary Google Calendar`,
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
    const events = this.#generateEvents(userId);

    await CompassSyncProcessor.processEvents(
      events.map((payload) => ({
        payload,
        applyTo: RecurringEventUpdateScope.THIS_EVENT,
        status: CompassEventStatus.CONFIRMED,
      })),
    );
  }

  async down(params: MigrationParams<MigrationContext>): Promise<void> {
    const { user, proceed } = await this.#prompt(params, "down");

    if (!proceed) return Promise.resolve();

    const userId = (await this.#findUserOrThrow(user!))._id.toString();
    const events = this.#generateEvents(userId);

    await CompassSyncProcessor.processEvents(
      events.map((payload) => ({
        payload,
        applyTo: RecurringEventUpdateScope.THIS_EVENT,
        status: CompassEventStatus.CANCELLED,
      })),
    );
  }
}
