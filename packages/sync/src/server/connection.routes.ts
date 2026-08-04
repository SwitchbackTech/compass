import { type Express, type RequestHandler, type Response } from "express";
import { Status } from "@core/errors/status.codes";
import { Logger } from "@core/logger/winston.logger";
import { decryptInternalCredential } from "@core/security/internal-credential-envelope";
import {
  BusyAvailabilityRequestSchema,
  type BusyAvailabilityResponse,
  BusyAvailabilityResponseSchema,
} from "@core/types/sync/availability.contracts";
import {
  type CalendarListResponse,
  type ConnectionListResponse,
  ConnectionRefreshResponseSchema,
  GoogleConnectionAdoptionRequestSchema,
  type ProviderCalendar,
  ProviderCalendarSchema,
  type ProviderConnection,
  ProviderConnectionSchema,
} from "@core/types/sync/connection.contracts";
import {
  EventInstanceListQuerySchema,
  type EventInstanceListResponse,
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
import {
  type BusyAvailability,
  computeBusyAvailability,
} from "@sync/domain/busy-query.service";
import { refreshPrincipalCalendars } from "@sync/domain/connection-refresh.service";
import { type DerivedConnectionState } from "@sync/domain/connection-state";
import { refreshConnectionState } from "@sync/domain/connection-state-refresh.service";
import { assembleEventInstances } from "@sync/domain/event-instance-assembly";
import {
  HORIZON_FUTURE_MONTHS,
  HORIZON_PAST_MONTHS,
} from "@sync/domain/horizon";
import { signOAuthState, verifyOAuthState } from "@sync/oauth/oauth-state";
import { googleCapabilitiesFromScopes } from "@sync/providers/google/google-capabilities";
import { type ProviderAuthAdapter } from "@sync/providers/provider-auth.port";
import { type ProviderEventWriter } from "@sync/providers/provider-event-writer.port";
import { redactedCause } from "@sync/safety/redact-error";
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
import { ProviderCalendarRepository } from "@sync/storage/repositories/provider-calendar.repository";
import { ProviderConnectionRepository } from "@sync/storage/repositories/provider-connection.repository";
import { type SyncMongoService } from "@sync/storage/sync-mongo.service";
import { syncRepositories } from "@sync/storage/sync-repositories";

const logger = Logger("sync:connection.routes");

export const CONNECTIONS_PATH = "/internal/connections";
export const CALENDARS_PATH = "/internal/calendars";
export const EVENTS_FULL_PATH = "/internal/events/full";
export const AVAILABILITY_BUSY_PATH = "/internal/availability/busy";
export const BEGIN_PATH = "/internal/connections/begin";
export const REFRESH_PATH = "/internal/connections/refresh";
export const ADOPT_GOOGLE_AUTHORIZATION_PATH =
  "/internal/connections/adopt-google-authorization";
// Where the provider redirects the browser after consent; `begin` builds the
// redirect_uri from it and the public callback route below mounts on it.
// Public reverse-proxy path (Caddy `/sync/*` → sync). Must match the Google
// OAuth client authorized redirect URI (`/sync/google`).
export const OAUTH_CALLBACK_PATH = "/sync/google";

// The rolling window Sync materializes occurrences for (shared with the
// projection layer via @sync/domain/horizon). A query's range is clamped to it
// so the caller can never force an unbounded scan back to the epoch or forward
// forever, regardless of the start/end it sends.
// The max page the wire contract allows; used when a query omits `limit`.
const DEFAULT_EVENT_PAGE_LIMIT = 500;

export interface ConnectionApiDeps {
  authMiddleware: RequestHandler;
  // Guards the global (cross-tenant) change-feed poll only — see
  // change-feed.routes.ts. Carried here because this is the shared deps bag
  // every internal route slice is wired from.
  serviceAuthMiddleware: RequestHandler;
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
  // Shared secret that encrypts credentials on the Compass API → Sync hop.
  credentialEncryptionSecret: string;
}

// Internal, authenticated connection endpoints. The tenant/principal comes from
// the signed auth context, never the request, so every query is scoped to the
// caller's own principal. Reads are allowed in passive mode — they touch no
// provider. Stored state can lag (OAuth link writes "importing"); list refreshes
// each row from live evidence before shaping the wire contract.
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
        const repos = syncRepositories(deps.mongo);
        const connections = repos.connections;
        const refreshDeps = {
          connections,
          calendars: repos.calendars,
          resources: repos.syncResources,
          credentials: repos.credentials,
          jobs: repos.jobs,
          invalidations: repos.invalidations,
        };
        const records = await connections.listByPrincipal(
          auth.tenantId,
          auth.principalId,
        );
        const refreshed = await Promise.all(
          records.map((record) => refreshConnectionState(refreshDeps, record)),
        );
        const response: ConnectionListResponse = {
          connections: refreshed.map(toProviderConnection),
        };
        res.status(Status.OK).json(response);
      } catch (error) {
        // Never surface storage internals or identity to the caller.
        logger.error(
          "Failed to list/refresh connections",
          redactedCause(error),
        );
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
      } catch (error) {
        logger.error("Failed to list calendars", redactedCause(error));
        respondInternalError(res);
      }
    },
  );

  // The full-fidelity event read backing the browser calendar. Same range/paging
  // shape as the occurrence feed, but each row carries the content, timestamps,
  // and series linkage needed to render AND edit — the occurrence page is joined
  // back to its owning events (and their series masters) and assembled into the
  // legacy-equivalent row-set. Scoped to the signed principal; a read, served in
  // passive mode too.
  app.get(
    EVENTS_FULL_PATH,
    internalRateLimit,
    deps.authMiddleware,
    async (req, res) => {
      const auth = requireAuth(req, res);
      if (!auth) return;
      if (!ensureConnected(deps.mongo, res)) return;

      const parsed = EventInstanceListQuerySchema.safeParse({
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
        const empty: EventInstanceListResponse = {
          instances: [],
          nextCursor: null,
        };
        res.status(Status.OK).json(empty);
        return;
      }

      const limit = query.limit ?? DEFAULT_EVENT_PAGE_LIMIT;
      try {
        const repos = syncRepositories(deps.mongo);
        const occurrenceRepo = repos.eventOccurrences;
        const eventRepo = repos.events;
        const resources = repos.syncResources;
        const activeByCalendar = await resources.activeGenerationByCalendar(
          auth.tenantId,
          auth.principalId,
          [...query.calendarIds],
        );
        const calendars = [...query.calendarIds].map((calendarId) => ({
          calendarId,
          generation: activeByCalendar.get(calendarId) ?? 0,
        }));
        const records = await occurrenceRepo.listByCalendarRange({
          tenantId: auth.tenantId,
          principalId: auth.principalId,
          calendars,
          start,
          end,
          limit,
          after,
        });

        // Hydrate the owning event of every occurrence in the page, then a
        // second hop for any series master referenced only by an exception (an
        // exception's occurrence points at the exception, whose seriesId names a
        // master that may not otherwise be in the page).
        const eventIds = [...new Set(records.map((record) => record.eventId))];
        const events = await eventRepo.findByIds(
          auth.tenantId,
          auth.principalId,
          eventIds,
        );
        const eventsById = new Map(events.map((event) => [event._id, event]));
        const missingMasterIds = [
          ...new Set(
            events.flatMap((event) =>
              event.recurrence.kind === "exception" &&
              !eventsById.has(event.recurrence.seriesId)
                ? [event.recurrence.seriesId]
                : [],
            ),
          ),
        ];
        if (missingMasterIds.length > 0) {
          const masters = await eventRepo.findByIds(
            auth.tenantId,
            auth.principalId,
            missingMasterIds,
          );
          for (const master of masters) eventsById.set(master._id, master);
        }

        // The cursor tracks only the occurrence page (back-filled master rows are
        // appended out-of-band by the assembler, so they never affect paging).
        const last = records.at(-1);
        const response: EventInstanceListResponse = {
          instances: assembleEventInstances(records, eventsById),
          nextCursor:
            records.length === limit && last
              ? encodeOccurrenceCursor(last)
              : null,
        };
        res.status(Status.OK).json(response);
      } catch (error) {
        logger.error(
          "Failed to list full-fidelity event instances",
          redactedCause(error),
        );
        respondInternalError(res);
      }
    },
  );

  // Merged busy intervals for a set of blocking calendars over a bounded window,
  // plus the freshness/completeness/bookability evidence the caller needs to
  // decide whether to display or to confirm a booking against them. A POST
  // because the query carries a structured body (calendar list + window +
  // policy). Scoped to the signed principal; served in passive mode too (a read).
  // The response carries intervals and freshness only — never event content.
  app.post(
    AVAILABILITY_BUSY_PATH,
    internalRateLimit,
    deps.authMiddleware,
    async (req, res) => {
      const auth = requireAuth(req, res);
      if (!auth) return;
      if (!ensureConnected(deps.mongo, res)) return;

      const parsed = BusyAvailabilityRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(Status.BAD_REQUEST).json({ error: "invalid_query" });
        return;
      }
      const query = parsed.data;

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
        // The window collapsed entirely outside the horizon: nothing to read, and
        // nothing verified, so fail closed. Build it through the mapper so the
        // ISO timestamps are branded like every other response.
        res.status(Status.OK).json(
          toBusyAvailabilityResponse({
            intervals: [],
            computedAt: new Date(now),
            connections: [],
            complete: false,
            issues: [],
            bookable: false,
          }),
        );
        return;
      }

      try {
        const repos = syncRepositories(deps.mongo);
        const availability = await computeBusyAvailability(
          {
            occurrences: repos.eventOccurrences,
            resources: repos.syncResources,
            connections: repos.connections,
          },
          {
            tenantId: auth.tenantId,
            principalId: auth.principalId,
            calendarIds: query.calendarIds,
            start,
            end,
            maxAgeMs: query.maxAgeMs,
            now: new Date(now),
          },
        );
        res.status(Status.OK).json(toBusyAvailabilityResponse(availability));
      } catch (error) {
        logger.error(
          "Failed to compute busy availability",
          redactedCause(error),
        );
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
        } catch (error) {
          logger.error(
            "Failed to look up connection for reconnect",
            redactedCause(error),
          );
          respondInternalError(res);
          return;
        }
        connectionId = parsed.data;
      }

      // A fresh connect by a principal that already has connections is an
      // add-account: show the provider's account chooser so the user can pick
      // a different account instead of silently re-authorizing the connected
      // one. Reconnect is account-pinned and must never show the chooser. A
      // lookup failure here only costs the chooser, so it does not fail the
      // request.
      let selectAccount = false;
      if (connectionId === null) {
        try {
          const existing = await new ProviderConnectionRepository(
            deps.mongo.db,
          ).listByPrincipal(auth.tenantId, auth.principalId);
          selectAccount = existing.length > 0;
        } catch (error) {
          logger.warn(
            "Failed to count connections for the account chooser",
            redactedCause(error),
          );
        }
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
        selectAccount,
      });
      res.status(Status.OK).json({ authorizationUrl });
    },
  );

  // The regular Compass Google sign-in flow already exchanged consent with
  // Google. Adopt that server-side authorization into Sync so sign-up creates
  // the same connection and initial import as the dedicated Connect flow.
  app.post(
    ADOPT_GOOGLE_AUTHORIZATION_PATH,
    internalRateLimit,
    deps.authMiddleware,
    async (req, res) => {
      const auth = requireAuth(req, res);
      if (!auth) return;
      if (!ensureConnected(deps.mongo, res)) return;
      if (deps.execution === "passive" || !deps.authAdapter) {
        res.status(Status.CONFLICT).json({ error: "provider_work_disabled" });
        return;
      }

      const parsed = GoogleConnectionAdoptionRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(Status.BAD_REQUEST).json({ error: "invalid_authorization" });
        return;
      }

      try {
        const refreshToken = decryptInternalCredential(
          deps.credentialEncryptionSecret,
          parsed.data.credential,
          {
            tenantId: auth.tenantId,
            principalId: auth.principalId,
            account: parsed.data.account,
            grantedScopes: parsed.data.grantedScopes,
          },
        );
        await linkConnection(
          deps,
          deps.authAdapter,
          {
            tenantId: auth.tenantId,
            principalId: auth.principalId,
            connectionId: null,
          },
          { ...parsed.data, refreshToken },
        );
        res.status(Status.OK).json({});
      } catch (error) {
        logger.error(
          "Failed to adopt Google authorization",
          redactedCause(error),
        );
        respondInternalError(res);
      }
    },
  );

  // User-triggered catch-up: enqueue an incremental pull for each events
  // resource owned by the signed principal. Passive-only deployments refuse —
  // there is no worker to drain the jobs.
  app.post(
    REFRESH_PATH,
    internalRateLimit,
    deps.authMiddleware,
    async (req, res) => {
      const auth = requireAuth(req, res);
      if (!auth) return;
      if (!ensureConnected(deps.mongo, res)) return;
      if (deps.execution === "passive") {
        res.status(Status.CONFLICT).json({ error: "provider_work_disabled" });
        return;
      }

      try {
        const repos = syncRepositories(deps.mongo);
        const enqueued = await refreshPrincipalCalendars(
          { resources: repos.syncResources, jobs: repos.jobs },
          auth.tenantId,
          auth.principalId,
          () => new Date((deps.now ?? Date.now)()),
        );
        res
          .status(Status.OK)
          .json(ConnectionRefreshResponseSchema.parse({ enqueued }));
      } catch (error) {
        logger.error(
          `Failed to refresh calendars for ${auth.tenantId}/${auth.principalId}`,
          redactedCause(error),
        );
        respondInternalError(res);
      }
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
    } catch (error) {
      // Bad code, no refresh token, unverifiable identity — nothing to link.
      logger.error("OAuth code exchange failed", redactedCause(error));
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
    } catch (error) {
      logger.error(
        "Failed to link connection after OAuth consent",
        redactedCause(error),
      );
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
      } catch (error) {
        logger.error("Failed to disconnect connection", redactedCause(error));
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
  const repos = syncRepositories(deps.mongo);
  const connections = repos.connections;

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

  // Every field deriveConnectionState would take here is a fixed literal (a
  // freshly linked connection always has a valid credential and an
  // account just identified, and never starts already import-complete), so
  // the derivation always lands on the same result — inlined rather than
  // calling it with a wall of constant evidence.
  const derived: DerivedConnectionState = { state: "importing", reason: null };

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
    const custody = new CredentialCustody(repos.credentials, authAdapter);
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

  // Bootstrap the connection's sync: enqueue a calendar-list discovery, which
  // discovers the account's calendars and, per active calendar, enqueues the
  // initial import (whose followup opens the push channel). This is the ONLY
  // trigger that starts the sync chain for a new connection. Coalesced per
  // connection, so a reconnect (which re-links) collapses into one discovery
  // rather than piling up. A failure throws so the connect is reported failed and
  // retried, rather than silently leaving a connection that never syncs.
  const jobs = repos.jobs;
  await jobs.enqueue({
    tenantId: state.tenantId,
    principalId: state.principalId,
    connectionId: connection._id,
    resourceId: null,
    commandId: null,
    kind: "calendarListSync",
    priority: 0,
    runAfter: new Date(),
    coalescingKey: `calendarListSync:${connection._id}`,
  });
}

// Map the busy-availability domain result (Date instants) to the wire contract
// (ISO strings). The domain already excludes event content, so this only
// reshapes timestamps.
function toBusyAvailabilityResponse(
  availability: BusyAvailability,
): BusyAvailabilityResponse {
  // Parse through the schema so ISO strings are validated and branded, and any
  // shape drift fails loudly here rather than reaching the caller malformed.
  return BusyAvailabilityResponseSchema.parse({
    intervals: availability.intervals.map((i) => ({
      start: i.start.toISOString(),
      end: i.end.toISOString(),
    })),
    computedAt: availability.computedAt.toISOString(),
    connections: availability.connections.map((c) => ({
      connectionId: c.connectionId,
      state: c.state,
      lastSyncedAt: c.lastSyncedAt?.toISOString() ?? null,
      lastHealthyAt: c.lastHealthyAt?.toISOString() ?? null,
    })),
    complete: availability.complete,
    issues: availability.issues.map((issue) => ({
      calendarId: issue.calendarId,
      reason: issue.reason,
    })),
    bookable: availability.bookable,
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
