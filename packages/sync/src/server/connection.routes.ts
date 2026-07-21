import { type Express, type RequestHandler, type Response } from "express";
import { Status } from "@core/errors/status.codes";
import {
  type CalendarListResponse,
  type ConnectionListResponse,
  type ProviderCalendar,
  ProviderCalendarSchema,
  type ProviderConnection,
  ProviderConnectionSchema,
} from "@core/types/sync/connection.contracts";
import {
  EventOccurrenceListQuerySchema,
  type EventOccurrenceListResponse,
  type SyncEventOccurrence,
  SyncEventOccurrenceSchema,
} from "@core/types/sync/event.contracts";
import {
  type ConnectionId,
  ConnectionIdSchema,
  type PrincipalId,
  type TenantId,
} from "@core/types/sync/identity.contracts";
import dayjs from "@core/util/date/dayjs";
import { type SyncExecutionMode } from "@sync/config/sync.config";
import { CredentialCustody } from "@sync/credentials/credential-custody.service";
import { deriveConnectionState } from "@sync/domain/connection-state";
import { signOAuthState, verifyOAuthState } from "@sync/oauth/oauth-state";
import { googleCapabilitiesFromScopes } from "@sync/providers/google/google-capabilities";
import { type ProviderAuthAdapter } from "@sync/providers/provider-auth.port";
import { type ProviderEventWriter } from "@sync/providers/provider-event-writer.port";
import {
  ensureConnected,
  internalRateLimit,
  requireAuth,
  respondInternalError,
} from "@sync/server/internal-http";
import { type EventOccurrenceRecord } from "@sync/storage/contracts/event-occurrence.contracts";
import { type ProviderCalendarRecord } from "@sync/storage/contracts/provider-calendar.contracts";
import { type ProviderConnectionRecord } from "@sync/storage/contracts/provider-connection.contracts";
import { CredentialRepository } from "@sync/storage/repositories/credential.repository";
import { EventOccurrenceRepository } from "@sync/storage/repositories/event-occurrence.repository";
import { ProviderCalendarRepository } from "@sync/storage/repositories/provider-calendar.repository";
import { ProviderConnectionRepository } from "@sync/storage/repositories/provider-connection.repository";
import { type SyncMongoService } from "@sync/storage/sync-mongo.service";

export const CONNECTIONS_PATH = "/internal/connections";
export const CALENDARS_PATH = "/internal/calendars";
export const EVENTS_PATH = "/internal/events";
export const BEGIN_PATH = "/internal/connections/begin";
// Where the provider redirects the browser after consent; `begin` builds the
// redirect_uri from it and the public callback route below mounts on it.
export const OAUTH_CALLBACK_PATH = "/oauth/google/callback";

// The rolling window Sync materializes occurrences for. A query's range is
// clamped to it so the caller can never force an unbounded scan back to the
// epoch or forward forever, regardless of the start/end it sends.
const HORIZON_PAST_MONTHS = 12;
const HORIZON_FUTURE_MONTHS = 18;
// The max page the wire contract allows; used when a query omits `limit`.
const DEFAULT_EVENT_PAGE_LIMIT = 500;

export interface ConnectionApiDeps {
  authMiddleware: RequestHandler;
  mongo: SyncMongoService;
  // Disconnect and begin make provider calls, so they are gated on execution.
  execution: SyncExecutionMode;
  // The provider authorization adapter, present only when the provider is
  // configured. Absent (or passive mode) means no provider work is possible.
  authAdapter?: ProviderAuthAdapter;
  // The provider event writer, present only when the provider is configured.
  // Not used by the connection routes themselves; carried here because this is
  // the shared bag the command routes are wired from.
  writer?: ProviderEventWriter;
  // Secret the OAuth CSRF state is signed with, and the public base URL the
  // provider callback resolves against.
  stateSecret: string;
  callbackBaseUrl: string;
  // Where the callback redirects the browser after connecting (already
  // defaulted to callbackBaseUrl by the caller when unset).
  postConnectRedirectUrl: string;
  // Injectable clock so state issuance/verification is deterministic in tests.
  now?: () => number;
}

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
    internalRateLimit,
    deps.authMiddleware,
    async (req, res) => {
      const auth = requireAuth(req, res);
      if (!auth) return;
      if (!ensureConnected(deps.mongo, res)) return;

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

  // List the caller's provider calendars, optionally narrowed to one connection
  // (?connectionId=) and/or active calendars only (?activeOnly=true). Scoped to
  // the signed principal; a read, so it is served in passive mode too.
  app.get(
    CALENDARS_PATH,
    internalRateLimit,
    deps.authMiddleware,
    async (req, res) => {
      const auth = requireAuth(req, res);
      if (!auth) return;
      if (!ensureConnected(deps.mongo, res)) return;

      // A present-but-bad connectionId (malformed, or repeated so Express parses
      // it as an array) is a bad request, not a silently-unfiltered result.
      const rawConnectionId = req.query["connectionId"];
      let connectionId: ConnectionId | undefined;
      if (rawConnectionId !== undefined) {
        const parsed =
          typeof rawConnectionId === "string"
            ? ConnectionIdSchema.safeParse(rawConnectionId)
            : null;
        if (!parsed?.success) {
          res
            .status(Status.BAD_REQUEST)
            .json({ error: "invalid_connection_id" });
          return;
        }
        connectionId = parsed.data;
      }

      try {
        const repo = new ProviderCalendarRepository(deps.mongo.db);
        const records = await repo.listByPrincipal(
          auth.tenantId,
          auth.principalId,
          { connectionId, activeOnly: req.query["activeOnly"] === "true" },
        );
        const response: CalendarListResponse = {
          calendars: records.map(toProviderCalendar),
        };
        res.status(Status.OK).json(response);
      } catch {
        respondInternalError(res);
      }
    },
  );

  // List the caller's derived event occurrences within a bounded window, keyset
  // paginated. The range is clamped to the sync horizon and the page is capped,
  // so this never expands a series to completion or scans unboundedly. Scoped to
  // the signed principal; a read, served in passive mode too.
  app.get(
    EVENTS_PATH,
    internalRateLimit,
    deps.authMiddleware,
    async (req, res) => {
      const auth = requireAuth(req, res);
      if (!auth) return;
      if (!ensureConnected(deps.mongo, res)) return;

      const parsed = EventOccurrenceListQuerySchema.safeParse({
        calendarIds: toQueryArray(req.query["calendarIds"]),
        start: req.query["start"],
        end: req.query["end"],
        cursor: req.query["cursor"],
        limit:
          req.query["limit"] === undefined
            ? undefined
            : Number(req.query["limit"]),
      });
      if (!parsed.success) {
        res.status(Status.BAD_REQUEST).json({ error: "invalid_query" });
        return;
      }
      const query = parsed.data;

      const after = decodeOccurrenceCursor(query.cursor);
      if (query.cursor !== undefined && !after) {
        res.status(Status.BAD_REQUEST).json({ error: "invalid_cursor" });
        return;
      }

      // Clamp the requested range to the horizon. A range that falls entirely
      // outside it collapses to empty rather than scanning anything.
      const now = deps.now ? deps.now() : Date.now();
      const start = maxDate(
        new Date(query.start),
        dayjs(now).subtract(HORIZON_PAST_MONTHS, "month").toDate(),
      );
      const end = minDate(
        new Date(query.end),
        dayjs(now).add(HORIZON_FUTURE_MONTHS, "month").toDate(),
      );
      if (start >= end) {
        const empty: EventOccurrenceListResponse = {
          occurrences: [],
          nextCursor: null,
        };
        res.status(Status.OK).json(empty);
        return;
      }

      const limit = query.limit ?? DEFAULT_EVENT_PAGE_LIMIT;
      try {
        const repo = new EventOccurrenceRepository(
          deps.mongo.db,
          deps.mongo.client,
        );
        const records = await repo.listByCalendarRange({
          tenantId: auth.tenantId,
          principalId: auth.principalId,
          calendarIds: [...query.calendarIds],
          start,
          end,
          limit,
          after,
        });
        // A full page means there may be more: hand back a cursor at the last
        // row. A short page is the end of the range, so there is no next cursor.
        const last = records.at(-1);
        const response: EventOccurrenceListResponse = {
          occurrences: records.map(toSyncEventOccurrence),
          nextCursor:
            records.length === limit && last
              ? encodeOccurrenceCursor(last)
              : null,
        };
        res.status(Status.OK).json(response);
      } catch {
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
    internalRateLimit,
    deps.authMiddleware,
    async (req, res) => {
      const auth = requireAuth(req, res);
      if (!auth) return;
      if (!ensureConnected(deps.mongo, res)) return;
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

  // The public OAuth callback the provider redirects the browser to after
  // consent. It carries NO internal-auth — the signed state is the only trust,
  // so it is verified before any work. On every outcome the browser is sent to
  // a server-configured URL (never a request-controlled one), so there is no
  // open-redirect surface. Nothing here pulls provider data; it only links the
  // account and stores the credential.
  app.get(OAUTH_CALLBACK_PATH, internalRateLimit, async (req, res) => {
    const redirect = (status: string) =>
      redirectAfterConnect(deps, res, status);

    if (deps.execution === "passive" || !deps.authAdapter) {
      return redirect("error");
    }
    if (!deps.mongo.isConnected) return redirect("error");
    // The user declined consent, or the provider returned an error.
    if (typeof req.query["error"] === "string") return redirect("declined");

    const code = req.query["code"];
    const state = req.query["state"];
    if (typeof code !== "string" || typeof state !== "string") {
      return redirect("error");
    }

    const verified = verifyOAuthState(
      deps.stateSecret,
      state,
      (deps.now ?? Date.now)(),
    );
    if (!verified.ok) return redirect("error");

    let authorization: Awaited<
      ReturnType<ProviderAuthAdapter["exchangeAuthorizationCode"]>
    >;
    try {
      authorization = await deps.authAdapter.exchangeAuthorizationCode({
        code,
        // Must match the redirect_uri begin used to build the consent URL.
        redirectUri: `${deps.callbackBaseUrl}${OAUTH_CALLBACK_PATH}`,
      });
    } catch {
      // Bad code, no refresh token, unverifiable identity — nothing to link.
      return redirect("error");
    }

    try {
      // authAdapter is non-null here (gated above); pass it so the helper needs
      // no assertion.
      await linkConnection(
        deps,
        deps.authAdapter,
        verified.payload,
        authorization,
      );
      return redirect("connected");
    } catch {
      return redirect("error");
    }
  });

  app.delete(
    `${CONNECTIONS_PATH}/:id`,
    internalRateLimit,
    deps.authMiddleware,
    async (req, res) => {
      const auth = requireAuth(req, res);
      if (!auth) return;
      if (!ensureConnected(deps.mongo, res)) return;

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

// Redirect the browser to the server-configured post-connect URL with a coarse
// status. The base is from config, never the request, so it can't be abused as
// an open redirect; status is a fixed label, carrying no provider detail.
function redirectAfterConnect(
  deps: ConnectionApiDeps,
  res: Response,
  status: string,
): void {
  const url = new URL(deps.postConnectRedirectUrl);
  url.searchParams.set("provider", "google");
  url.searchParams.set("status", status);
  res.redirect(url.toString());
}

// Link an authorized account: upsert its connection (create or reconnect by the
// stable provider-account identity) and store the durable credential. The
// initial state is DERIVED from evidence — a just-identified account whose first
// import has not finished is "importing", not set arbitrarily.
async function linkConnection(
  deps: ConnectionApiDeps,
  authAdapter: ProviderAuthAdapter,
  state: {
    tenantId: TenantId;
    principalId: PrincipalId;
    connectionId: ConnectionId | null;
  },
  authorization: Awaited<
    ReturnType<ProviderAuthAdapter["exchangeAuthorizationCode"]>
  >,
): Promise<void> {
  const connections = new ProviderConnectionRepository(deps.mongo.db);

  // Reconnect: the state named a specific connection to re-authorize. Require
  // the account Google just returned to match that connection's account.
  // Otherwise the user consented with a different Google account (easy with
  // multiple sessions, and there is no login_hint), and silently creating a
  // second connection would leave the one they meant to fix stuck. Fail instead.
  if (state.connectionId) {
    const existing = await connections.findById(
      state.tenantId,
      state.principalId,
      state.connectionId,
    );
    if (
      !existing ||
      existing.account.providerAccountId !==
        authorization.account.providerAccountId
    ) {
      throw new Error("Reconnect account does not match the named connection");
    }
  }

  const derived = deriveConnectionState(
    {
      disconnectedAt: null,
      credential: "valid",
      permanentConflict: false,
      accountIdentified: true,
      initialImportComplete: false,
      catchingUp: false,
      oldestDueWorkAt: null,
      recentProviderErrors: false,
    },
    new Date(),
  );

  const connection = await connections.upsertByProviderAccount({
    tenantId: state.tenantId,
    principalId: state.principalId,
    provider: "google",
    account: authorization.account,
    capabilities: googleCapabilitiesFromScopes(authorization.grantedScopes),
    state: derived.state,
    stateReason: derived.reason,
    lastSyncedAt: null,
    lastHealthyAt: null,
  });

  try {
    const custody = new CredentialCustody(
      new CredentialRepository(deps.mongo.db),
      authAdapter,
    );
    await custody.store({
      connectionId: connection._id,
      provider: "google",
      refreshToken: authorization.refreshToken,
      scopes: [...authorization.grantedScopes],
    });
  } catch (error) {
    // The connection persisted but its credential did not. Rather than leave it
    // reporting "importing" with no credential to make progress, mark it
    // disconnected (best-effort) so it reads as unusable; a retry re-links and
    // clears the disconnect.
    await connections
      .markDisconnected(state.tenantId, state.principalId, connection._id)
      .catch(() => undefined);
    throw error;
  }
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

// Map a stored calendar record (string ids, Date timestamps) to the wire
// contract (ISO-string timestamps), validated through the schema on the way out.
export function toProviderCalendar(
  record: ProviderCalendarRecord,
): ProviderCalendar {
  return ProviderCalendarSchema.parse({
    id: record._id,
    tenantId: record.tenantId,
    principalId: record.principalId,
    connectionId: record.connectionId,
    providerCalendarId: record.providerCalendarId,
    displayName: record.displayName,
    color: record.color,
    active: record.active,
    primary: record.primary,
    accessRole: record.accessRole,
    capabilities: record.capabilities,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  });
}

// Map a stored occurrence record to the display wire contract, dropping the
// storage-only fields (tenant/principal scope, startAt axis, generation) and
// validating the projection through the schema on the way out.
export function toSyncEventOccurrence(
  record: EventOccurrenceRecord,
): SyncEventOccurrence {
  return SyncEventOccurrenceSchema.parse({
    occurrenceKey: record.occurrenceKey,
    eventId: record.eventId,
    calendarId: record.calendarId,
    schedule: record.schedule,
    busy: record.busy,
    title: record.title,
    cancelled: record.cancelled,
  });
}

// Express parses a single query value as a string and a repeated one as an
// array. Normalize to an array so a single calendarId and many are handled the
// same; the schema then validates each element is a real id.
function toQueryArray(value: unknown): unknown[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

// The pagination cursor is opaque to the caller: base64url of the keyset
// position (the last row's start instant and _id). It is not signed because the
// query is already scoped to the signed principal, so a tampered cursor can only
// reposition within the caller's own data. Decode returns null on any
// malformation, which the caller turns into a 400.
function encodeOccurrenceCursor(record: EventOccurrenceRecord): string {
  const payload = JSON.stringify({
    startAt: record.startAt.toISOString(),
    id: record._id,
  });
  return Buffer.from(payload, "utf8").toString("base64url");
}

function decodeOccurrenceCursor(
  cursor: string | undefined,
): { startAt: Date; id: string } | undefined {
  if (cursor === undefined) return undefined;
  try {
    const decoded = JSON.parse(
      Buffer.from(cursor, "base64url").toString("utf8"),
    );
    if (
      typeof decoded?.startAt !== "string" ||
      typeof decoded?.id !== "string"
    ) {
      return undefined;
    }
    const startAt = new Date(decoded.startAt);
    if (Number.isNaN(startAt.getTime())) return undefined;
    return { startAt, id: decoded.id };
  } catch {
    return undefined;
  }
}

const maxDate = (a: Date, b: Date): Date => (a > b ? a : b);
const minDate = (a: Date, b: Date): Date => (a < b ? a : b);
