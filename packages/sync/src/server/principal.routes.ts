import { type Express, type RequestHandler } from "express";
import { Status } from "@core/errors/status.codes";
import { PrincipalPurgeResponseSchema } from "@core/types/sync/principal.contracts";
import { CredentialCustody } from "@sync/credentials/credential-custody.service";
import { purgePrincipal } from "@sync/domain/principal-purge.service";
import { type ProviderAuthAdapter } from "@sync/providers/provider-auth.port";
import {
  ensureConnected,
  internalRateLimit,
  requireAuth,
  respondInternalError,
} from "@sync/server/internal-http";
import { CommandRepository } from "@sync/storage/repositories/command.repository";
import { CredentialRepository } from "@sync/storage/repositories/credential.repository";
import { DeletionMarkerRepository } from "@sync/storage/repositories/deletion-marker.repository";
import { EventRepository } from "@sync/storage/repositories/event.repository";
import { EventOccurrenceRepository } from "@sync/storage/repositories/event-occurrence.repository";
import { InvalidationRepository } from "@sync/storage/repositories/invalidation.repository";
import { JobRepository } from "@sync/storage/repositories/job.repository";
import { ProviderCalendarRepository } from "@sync/storage/repositories/provider-calendar.repository";
import { ProviderConnectionRepository } from "@sync/storage/repositories/provider-connection.repository";
import { SyncResourceRepository } from "@sync/storage/repositories/sync-resource.repository";
import { type SyncMongoService } from "@sync/storage/sync-mongo.service";

export const PRINCIPAL_PATH = "/internal/principal";

export interface PrincipalApiDeps {
  authMiddleware: RequestHandler;
  mongo: SyncMongoService;
  // Optional: when present, credentials are revoked at the provider before
  // local delete. Account deletion still proceeds without it (passive /
  // unconfigured deployments) so Sync-held tokens are never stranded.
  authAdapter?: ProviderAuthAdapter;
}

// Hard-delete every Sync-held row for the signed principal. Served in passive
// mode too — account deletion must wipe Sync data even when provider work is
// disabled. Soft disconnect retention does NOT apply here.
export function registerPrincipalRoutes(
  app: Express,
  deps: PrincipalApiDeps,
): void {
  app.delete(
    PRINCIPAL_PATH,
    internalRateLimit,
    deps.authMiddleware,
    async (req, res) => {
      const auth = requireAuth(req, res);
      if (!auth) return;
      if (!ensureConnected(deps.mongo, res)) return;

      try {
        const credentials = new CredentialRepository(deps.mongo.db);
        const counts = await purgePrincipal(
          {
            connections: new ProviderConnectionRepository(deps.mongo.db),
            credentials,
            calendars: new ProviderCalendarRepository(deps.mongo.db),
            events: new EventRepository(deps.mongo.db),
            eventOccurrences: new EventOccurrenceRepository(
              deps.mongo.db,
              deps.mongo.client,
            ),
            syncResources: new SyncResourceRepository(deps.mongo.db),
            commands: new CommandRepository(deps.mongo.db),
            jobs: new JobRepository(deps.mongo.db),
            deletionMarkers: new DeletionMarkerRepository(deps.mongo.db),
            invalidations: new InvalidationRepository(deps.mongo.db),
            custody: deps.authAdapter
              ? new CredentialCustody(credentials, deps.authAdapter)
              : undefined,
          },
          auth.tenantId,
          auth.principalId,
        );
        res.status(Status.OK).json(PrincipalPurgeResponseSchema.parse(counts));
      } catch {
        respondInternalError(res);
      }
    },
  );
}
