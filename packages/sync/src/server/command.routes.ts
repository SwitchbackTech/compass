import { type Express, type RequestHandler } from "express";
import { Status } from "@core/errors/status.codes";
import {
  CommandSubmitRequestSchema,
  type CommandSubmitResponse,
  type SyncCommand,
  SyncCommandSchema,
} from "@core/types/sync/command.contracts";
import { type SyncExecutionMode } from "@sync/config/sync.config";
import { CredentialCustody } from "@sync/credentials/credential-custody.service";
import { submitCloudCommand } from "@sync/domain/cloud-command.service";
import { type ProviderAuthAdapter } from "@sync/providers/provider-auth.port";
import { type ProviderEventWriter } from "@sync/providers/provider-event-writer.port";
import {
  ensureConnected,
  internalRateLimit,
  requireAuth,
  respondInternalError,
} from "@sync/server/internal-http";
import { type CommandRecord } from "@sync/storage/contracts/command.contracts";
import { CommandRepository } from "@sync/storage/repositories/command.repository";
import { CredentialRepository } from "@sync/storage/repositories/credential.repository";
import { DeletionMarkerRepository } from "@sync/storage/repositories/deletion-marker.repository";
import { EventRepository } from "@sync/storage/repositories/event.repository";
import { EventOccurrenceRepository } from "@sync/storage/repositories/event-occurrence.repository";
import { InvalidationRepository } from "@sync/storage/repositories/invalidation.repository";
import { ProviderCalendarRepository } from "@sync/storage/repositories/provider-calendar.repository";
import { type SyncMongoService } from "@sync/storage/sync-mongo.service";

export const COMMANDS_PATH = "/internal/commands";

export interface CommandApiDeps {
  authMiddleware: RequestHandler;
  mongo: SyncMongoService;
  // Whether provider work is enabled. A provider-targeted create executes only
  // when active; otherwise it is recorded pending.
  execution: SyncExecutionMode;
  // Provider write + auth adapters, present only when a provider is configured.
  // Both are needed to execute a provider create (the writer performs it, the
  // auth adapter backs the per-request credential custody). Absent leaves
  // provider-targeted commands pending.
  writer?: ProviderEventWriter;
  authAdapter?: ProviderAuthAdapter;
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
        // Build the provider write capability only when both adapters exist;
        // custody is per-request (it holds the request's db-backed credential
        // repo), the writer is shared.
        const provider =
          deps.writer && deps.authAdapter
            ? {
                writer: deps.writer,
                custody: new CredentialCustody(
                  new CredentialRepository(deps.mongo.db),
                  deps.authAdapter,
                ),
              }
            : undefined;

        const { command, changed } = await submitCloudCommand(
          {
            commands: new CommandRepository(deps.mongo.db),
            events: new EventRepository(deps.mongo.db),
            calendars: new ProviderCalendarRepository(deps.mongo.db),
            occurrences: new EventOccurrenceRepository(
              deps.mongo.db,
              deps.mongo.client,
            ),
            markers: new DeletionMarkerRepository(deps.mongo.db),
            execution: deps.execution,
            provider,
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

        // Content-free change-feed notice for Compass API → browser SSE.
        // Emitted only when this request durably changed command/event state,
        // so an idempotent replay does not duplicate outbox rows.
        if (changed) {
          const events = new EventRepository(deps.mongo.db);
          const event = await events.findById(
            auth.tenantId,
            auth.principalId,
            command.eventId,
          );
          const invalidations = new InvalidationRepository(deps.mongo.db);
          const emittedAt = deps.now ? new Date(deps.now()) : new Date();
          const notices = [
            {
              kind: "command" as const,
              commandId: command._id,
            },
            ...(event
              ? [
                  {
                    kind: "event" as const,
                    eventId: command.eventId,
                    calendarId: event.calendarId,
                  },
                ]
              : []),
          ];
          await invalidations.appendMany(
            auth.tenantId,
            auth.principalId,
            notices,
            emittedAt,
          );
        }

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
