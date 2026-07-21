import { type Express, type RequestHandler, type Response } from "express";
import { Status } from "@core/errors/status.codes";
import {
  type ConnectionListResponse,
  type ProviderConnection,
  ProviderConnectionSchema,
} from "@core/types/sync/connection.contracts";
import { type InternalAuthedRequest } from "@sync/auth/internal-auth";
import { type ProviderConnectionRecord } from "@sync/storage/contracts/provider-connection.contracts";
import { ProviderConnectionRepository } from "@sync/storage/repositories/provider-connection.repository";
import { type SyncMongoService } from "@sync/storage/sync-mongo.service";

export const CONNECTIONS_PATH = "/internal/connections";

// Internal, authenticated connection endpoints. The tenant/principal comes from
// the signed auth context, never the request, so every query is scoped to the
// caller's own principal. Reads are allowed in passive mode — they touch no
// provider. The record's stored state is authoritative (it was derived from
// evidence at write time), so this layer only reshapes it to the wire contract.
export function registerConnectionRoutes(
  app: Express,
  deps: { authMiddleware: RequestHandler; mongo: SyncMongoService },
): void {
  app.get(CONNECTIONS_PATH, deps.authMiddleware, async (req, res) => {
    const auth = (req as InternalAuthedRequest).syncAuth;
    // The middleware always sets this on success; treat its absence as a bug,
    // not an authorization, and never fall through to an unscoped query.
    if (!auth) {
      res.status(Status.UNAUTHORIZED).json({ error: "unauthorized" });
      return;
    }
    if (!deps.mongo.isConnected) {
      res.status(Status.SERVICE_UNAVAILABLE).json({ error: "not_ready" });
      return;
    }

    try {
      const repo = new ProviderConnectionRepository(deps.mongo.db);
      const records = await repo.listByPrincipal(
        auth.tenantId,
        auth.principalId,
      );
      const response: ConnectionListResponse = {
        connections: records.map(toProviderConnection),
      };
      res.status(Status.OK).json(response);
    } catch {
      // Never surface storage internals or identity to the caller.
      respondInternalError(res);
    }
  });
}

// Map a stored connection record (string ids, Date timestamps) to the wire
// contract (ISO-string timestamps). Parsing through the schema validates and
// brands the result, so a row that somehow violates the contract fails loudly
// here rather than reaching the caller malformed.
export function toProviderConnection(
  record: ProviderConnectionRecord,
): ProviderConnection {
  return ProviderConnectionSchema.parse({
    id: record._id,
    tenantId: record.tenantId,
    principalId: record.principalId,
    provider: record.provider,
    account: record.account,
    capabilities: record.capabilities,
    state: record.state,
    stateReason: record.stateReason,
    lastSyncedAt: record.lastSyncedAt?.toISOString() ?? null,
    lastHealthyAt: record.lastHealthyAt?.toISOString() ?? null,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  });
}

function respondInternalError(res: Response): void {
  res.status(Status.INTERNAL_SERVER).json({ error: "internal_error" });
}
