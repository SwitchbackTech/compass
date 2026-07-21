import {
  type Express,
  type Request,
  type RequestHandler,
  type Response,
} from "express";
import { rateLimit } from "express-rate-limit";
import { Status } from "@core/errors/status.codes";
import {
  type ConnectionListResponse,
  type ProviderConnection,
  ProviderConnectionSchema,
} from "@core/types/sync/connection.contracts";
import { ConnectionIdSchema } from "@core/types/sync/identity.contracts";
import { type InternalAuthedRequest } from "@sync/auth/internal-auth";
import { type SyncExecutionMode } from "@sync/config/sync.config";
import { CredentialCustody } from "@sync/credentials/credential-custody.service";
import { signOAuthState } from "@sync/oauth/oauth-state";
import { type ProviderAuthAdapter } from "@sync/providers/provider-auth.port";
import { type ProviderConnectionRecord } from "@sync/storage/contracts/provider-connection.contracts";
import { CredentialRepository } from "@sync/storage/repositories/credential.repository";
import { ProviderConnectionRepository } from "@sync/storage/repositories/provider-connection.repository";
import { type SyncMongoService } from "@sync/storage/sync-mongo.service";

export const CONNECTIONS_PATH = "/internal/connections";
export const BEGIN_PATH = "/internal/connections/begin";
// Where the provider redirects the browser after consent. The callback route
// mounts here in a later slice; `begin` builds the redirect_uri from it now.
export const OAUTH_CALLBACK_PATH = "/oauth/google/callback";

export interface ConnectionApiDeps {
  authMiddleware: RequestHandler;
  mongo: SyncMongoService;
  // Disconnect and begin make provider calls, so they are gated on execution.
  execution: SyncExecutionMode;
  // The provider authorization adapter, present only when the provider is
  // configured. Absent (or passive mode) means no provider work is possible.
  authAdapter?: ProviderAuthAdapter;
  // Secret the OAuth CSRF state is signed with, and the public base URL the
  // provider callback resolves against.
  stateSecret: string;
  callbackBaseUrl: string;
  // Injectable clock so state issuance is deterministic in tests.
  now?: () => number;
}

// A generous backstop, not a throttle: the only caller is the trusted Compass
// API over a private network, so this bounds a runaway loop or a compromised
// caller rather than shaping normal traffic. Keyed per client ip, fixed window.
const connectionRateLimit = rateLimit({
  windowMs: 60_000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
});

// Internal, authenticated connection endpoints. The tenant/principal comes from
// the signed auth context, never the request, so every query is scoped to the
// caller's own principal. Reads are allowed in passive mode — they touch no
// provider. The record's stored state is authoritative (it was derived from
// evidence at write time), so this layer only reshapes it to the wire contract.
export function registerConnectionRoutes(
  app: Express,
  deps: ConnectionApiDeps,
): void {
  app.get(
    CONNECTIONS_PATH,
    connectionRateLimit,
    deps.authMiddleware,
    async (req, res) => {
      const auth = requireAuth(req, res);
      if (!auth) return;
      if (!ensureConnected(deps, res)) return;

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
    },
  );

  // Start an OAuth authorization: return the provider consent URL carrying a
  // signed CSRF state that binds the flow to this principal (and, for reconnect,
  // to one existing connection). Completing consent creates/updates the
  // connection in the callback slice; begin itself only mints the URL.
  app.post(
    BEGIN_PATH,
    connectionRateLimit,
    deps.authMiddleware,
    async (req, res) => {
      const auth = requireAuth(req, res);
      if (!auth) return;
      if (!ensureConnected(deps, res)) return;
      // Authorizing touches the provider, so a passive or unconfigured service
      // refuses rather than handing back a URL it could never complete.
      if (deps.execution === "passive" || !deps.authAdapter) {
        res.status(Status.CONFLICT).json({ error: "provider_work_disabled" });
        return;
      }

      // Optional connectionId means reconnect: validate it is a real id owned by
      // this principal, so the state cannot bind a flow to a foreign connection.
      let connectionId = null;
      const rawConnectionId = (req.body as { connectionId?: unknown })
        ?.connectionId;
      if (rawConnectionId !== undefined && rawConnectionId !== null) {
        const parsed = ConnectionIdSchema.safeParse(rawConnectionId);
        if (!parsed.success) {
          res
            .status(Status.BAD_REQUEST)
            .json({ error: "invalid_connection_id" });
          return;
        }
        try {
          const owned = await new ProviderConnectionRepository(
            deps.mongo.db,
          ).findById(auth.tenantId, auth.principalId, parsed.data);
          if (!owned) {
            res.status(Status.NOT_FOUND).json({ error: "not_found" });
            return;
          }
        } catch {
          respondInternalError(res);
          return;
        }
        connectionId = parsed.data;
      }

      const state = signOAuthState(deps.stateSecret, {
        tenantId: auth.tenantId,
        principalId: auth.principalId,
        connectionId,
        issuedAt: (deps.now ?? Date.now)(),
      });
      const authorizationUrl = deps.authAdapter.buildAuthorizationUrl({
        state,
        redirectUri: `${deps.callbackBaseUrl}${OAUTH_CALLBACK_PATH}`,
      });
      res.status(Status.OK).json({ authorizationUrl });
    },
  );

  app.delete(
    `${CONNECTIONS_PATH}/:id`,
    connectionRateLimit,
    deps.authMiddleware,
    async (req, res) => {
      const auth = requireAuth(req, res);
      if (!auth) return;
      if (!ensureConnected(deps, res)) return;

      // Disconnect revokes at the provider, so a passive service (or one with no
      // provider configured) must refuse rather than half-disconnect: delete the
      // credential locally while leaving live authority at the provider.
      if (deps.execution === "passive" || !deps.authAdapter) {
        res.status(Status.CONFLICT).json({ error: "provider_work_disabled" });
        return;
      }

      const id = ConnectionIdSchema.safeParse(req.params["id"]);
      if (!id.success) {
        res.status(Status.BAD_REQUEST).json({ error: "invalid_connection_id" });
        return;
      }

      try {
        const connections = new ProviderConnectionRepository(deps.mongo.db);
        // Confirm ownership before touching credentials, so a missing or foreign
        // connection is a clean 404 that revokes nothing.
        const connection = await connections.findById(
          auth.tenantId,
          auth.principalId,
          id.data,
        );
        if (!connection) {
          res.status(Status.NOT_FOUND).json({ error: "not_found" });
          return;
        }

        // Revoke + delete the credential first (the security-critical step), then
        // record the disconnect. Both are idempotent, so a retry after a partial
        // failure converges.
        const custody = new CredentialCustody(
          new CredentialRepository(deps.mongo.db),
          deps.authAdapter,
        );
        await custody.disconnect(id.data);
        await connections.markDisconnected(
          auth.tenantId,
          auth.principalId,
          id.data,
        );
        res.status(Status.NO_CONTENT).end();
      } catch {
        respondInternalError(res);
      }
    },
  );
}

// Read the verified auth context. The middleware always sets it on success;
// treat its absence as a bug, not an authorization, and never run unscoped.
function requireAuth(
  req: Request,
  res: Response,
): InternalAuthedRequest["syncAuth"] | undefined {
  const auth = (req as InternalAuthedRequest).syncAuth;
  if (!auth) {
    res.status(Status.UNAUTHORIZED).json({ error: "unauthorized" });
    return undefined;
  }
  return auth;
}

function ensureConnected(deps: ConnectionApiDeps, res: Response): boolean {
  if (!deps.mongo.isConnected) {
    res.status(Status.SERVICE_UNAVAILABLE).json({ error: "not_ready" });
    return false;
  }
  return true;
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
