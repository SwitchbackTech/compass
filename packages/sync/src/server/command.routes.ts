import { type Express, type RequestHandler } from "express";
import { Status } from "@core/errors/status.codes";
import {
  CommandSubmitRequestSchema,
  type CommandSubmitResponse,
  type SyncCommand,
  SyncCommandSchema,
} from "@core/types/sync/command.contracts";
import { submitCloudCommand } from "@sync/domain/cloud-command.service";
import {
  ensureConnected,
  internalRateLimit,
  requireAuth,
  respondInternalError,
} from "@sync/server/internal-http";
import { type CommandRecord } from "@sync/storage/contracts/command.contracts";
import { CommandRepository } from "@sync/storage/repositories/command.repository";
import { EventRepository } from "@sync/storage/repositories/event.repository";
import { type SyncMongoService } from "@sync/storage/sync-mongo.service";

export const COMMANDS_PATH = "/internal/commands";

export interface CommandApiDeps {
  authMiddleware: RequestHandler;
  mongo: SyncMongoService;
  // Injectable clock so local confirmation timestamps are deterministic in
  // tests.
  now?: () => number;
}

// Internal, authenticated command ingress. Durably records acknowledged user
// intent for one event mutation. A cloud-only create is applied to the
// canonical store and confirmed locally in the same request — no provider call
// — so this is served in passive mode too. The tenant/principal come from the
// signed auth context, never the body, so a caller only ever writes to its own
// principal.
export function registerCommandRoutes(
  app: Express,
  deps: CommandApiDeps,
): void {
  app.post(
    COMMANDS_PATH,
    internalRateLimit,
    deps.authMiddleware,
    async (req, res) => {
      const auth = requireAuth(req, res);
      if (!auth) return;
      if (!ensureConnected(deps.mongo, res)) return;

      const parsed = CommandSubmitRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(Status.BAD_REQUEST).json({ error: "invalid_command" });
        return;
      }
      const request = parsed.data;

      try {
        const command = await submitCloudCommand(
          {
            commands: new CommandRepository(deps.mongo.db),
            events: new EventRepository(deps.mongo.db),
          },
          {
            tenantId: auth.tenantId,
            principalId: auth.principalId,
            idempotencyKey: request.idempotencyKey,
            eventId: request.eventId,
            input: request.input,
            expectedVersion: request.expectedVersion,
          },
          () => (deps.now ? new Date(deps.now()) : new Date()),
        );
        const response: CommandSubmitResponse = {
          command: toSyncCommand(command),
        };
        res.status(Status.OK).json(response);
      } catch {
        respondInternalError(res);
      }
    },
  );
}

// Map a stored command record (Date timestamps) to the wire contract (ISO
// strings), validated through the schema on the way out so a row that somehow
// violates the contract fails here rather than reaching the caller malformed.
export function toSyncCommand(record: CommandRecord): SyncCommand {
  return SyncCommandSchema.parse({
    id: record._id,
    tenantId: record.tenantId,
    principalId: record.principalId,
    idempotencyKey: record.idempotencyKey,
    eventId: record.eventId,
    input: record.input,
    expectedVersion: record.expectedVersion,
    outcome: record.outcome,
    attemptCount: record.attemptCount,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  });
}
