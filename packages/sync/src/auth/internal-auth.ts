import { type NextFunction, type Request, type Response } from "express";
import { Status } from "@core/errors/status.codes";
import {
  type PrincipalId,
  PrincipalIdSchema,
  type TenantId,
  TenantIdSchema,
} from "@core/types/sync/identity.contracts";
import { createHmac, timingSafeEqual } from "node:crypto";

// Internal service authentication for the Compass Sync service.
//
// Only the trusted Compass API calls Sync's internal routes. Each request is
// HMAC-signed with a shared, rotatable service secret over a timestamp and the
// tenant/principal the request acts on behalf of. Sync derives the
// tenant/principal context from those SIGNED headers — never from the request
// body — so a caller cannot assert ownership of another tenant without the
// secret. Every request is an authenticated caller identity, and every
// resource is authorized against its tenant/principal.
//
// The signed timestamp bounds replay to a short freshness window rather than a
// nonce store: on a private TLS network with a single trusted caller that is
// the accepted trade-off. A nonce store is deferred until a threat justifies
// it (named wart, not an omission).

export const INTERNAL_AUTH_HEADERS = {
  tenant: "x-sync-tenant",
  principal: "x-sync-principal",
  timestamp: "x-sync-timestamp",
  signature: "x-sync-signature",
} as const;

export const DEFAULT_FRESHNESS_MS = 5 * 60 * 1000;

export interface SyncAuthContext {
  readonly tenantId: TenantId;
  readonly principalId: PrincipalId;
}

export interface InternalAuthedRequest extends Request {
  syncAuth?: SyncAuthContext;
}

export interface SignInput {
  readonly timestamp: number;
  readonly tenantId: string;
  readonly principalId: string;
}

// Bind the signature to the timestamp and the asserted identity. Field
// separators are non-hex/non-ObjectId characters so the payload can't be
// ambiguously re-segmented.
function signaturePayload(input: SignInput): string {
  return `${input.timestamp}.${input.tenantId}.${input.principalId}`;
}

export function signInternalRequest(secret: string, input: SignInput): string {
  return createHmac("sha256", secret)
    .update(signaturePayload(input))
    .digest("hex");
}

export type VerifyReason =
  | "missing"
  | "malformed"
  | "stale"
  | "invalidSignature";

export type VerifyResult =
  | { readonly ok: true; readonly context: SyncAuthContext }
  | { readonly ok: false; readonly reason: VerifyReason };

export interface VerifyInput {
  readonly secret: string;
  readonly headers: Record<string, string | string[] | undefined>;
  readonly now: number;
  readonly freshnessMs?: number;
}

function header(
  headers: VerifyInput["headers"],
  name: string,
): string | undefined {
  const value = headers[name];
  return Array.isArray(value) ? value[0] : value;
}

function signaturesMatch(expected: string, provided: string): boolean {
  // Equal-length is a precondition of timingSafeEqual; a wrong-length input is
  // trivially invalid and leaks nothing (a valid HMAC-hex is always 64 chars).
  if (expected.length !== provided.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(provided));
}

export function verifyInternalRequest(input: VerifyInput): VerifyResult {
  const rawTenant = header(input.headers, INTERNAL_AUTH_HEADERS.tenant);
  const rawPrincipal = header(input.headers, INTERNAL_AUTH_HEADERS.principal);
  const rawTimestamp = header(input.headers, INTERNAL_AUTH_HEADERS.timestamp);
  const rawSignature = header(input.headers, INTERNAL_AUTH_HEADERS.signature);

  if (!rawTenant || !rawPrincipal || !rawTimestamp || !rawSignature) {
    return { ok: false, reason: "missing" };
  }

  const timestamp = Number(rawTimestamp);
  if (!Number.isFinite(timestamp)) {
    return { ok: false, reason: "malformed" };
  }

  const tenant = TenantIdSchema.safeParse(rawTenant);
  const principal = PrincipalIdSchema.safeParse(rawPrincipal);
  if (!tenant.success || !principal.success) {
    return { ok: false, reason: "malformed" };
  }

  const freshnessMs = input.freshnessMs ?? DEFAULT_FRESHNESS_MS;
  if (Math.abs(input.now - timestamp) > freshnessMs) {
    return { ok: false, reason: "stale" };
  }

  const expected = signInternalRequest(input.secret, {
    timestamp,
    tenantId: rawTenant,
    principalId: rawPrincipal,
  });
  if (!signaturesMatch(expected, rawSignature)) {
    return { ok: false, reason: "invalidSignature" };
  }

  return {
    ok: true,
    context: { tenantId: tenant.data, principalId: principal.data },
  };
}

// Express middleware guarding internal routes. Health routes are never mounted
// behind this — they stay public and content-free. On failure it responds 401
// with only a generic reason code, never request or identity content.
export function createInternalAuthMiddleware(deps: {
  secret: string;
  freshnessMs?: number;
  now?: () => number;
}) {
  const now = deps.now ?? Date.now;
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = verifyInternalRequest({
      secret: deps.secret,
      headers: req.headers,
      now: now(),
      freshnessMs: deps.freshnessMs,
    });

    if (!result.ok) {
      res
        .status(Status.UNAUTHORIZED)
        .json({ error: "unauthorized", reason: result.reason });
      return;
    }

    (req as InternalAuthedRequest).syncAuth = result.context;
    next();
  };
}

// A second, narrower auth scheme for routes that act on behalf of no single
// tenant/principal — today, only the global (cross-tenant) change-feed poll
// the backend runs once per process instead of once per connected user.
// Reuses the same shared secret and the same timestamp/signature headers, but
// signs a domain-separated payload with no identity claim, so:
// - a per-principal-signed request can never be replayed here (different HMAC
//   preimage, see signaturePayload above), and
// - this route can never assert ownership of any tenant's data by
//   construction — there is no tenant/principal to derive, only proof the
//   caller holds the secret.
function servicePayload(timestamp: number): string {
  return `service.${timestamp}`;
}

export function signServiceRequest(secret: string, timestamp: number): string {
  return createHmac("sha256", secret)
    .update(servicePayload(timestamp))
    .digest("hex");
}

export type VerifyServiceResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: VerifyReason };

export function verifyServiceRequest(input: {
  readonly secret: string;
  readonly headers: Record<string, string | string[] | undefined>;
  readonly now: number;
  readonly freshnessMs?: number;
}): VerifyServiceResult {
  const rawTimestamp = header(input.headers, INTERNAL_AUTH_HEADERS.timestamp);
  const rawSignature = header(input.headers, INTERNAL_AUTH_HEADERS.signature);

  if (!rawTimestamp || !rawSignature) {
    return { ok: false, reason: "missing" };
  }

  const timestamp = Number(rawTimestamp);
  if (!Number.isFinite(timestamp)) {
    return { ok: false, reason: "malformed" };
  }

  const freshnessMs = input.freshnessMs ?? DEFAULT_FRESHNESS_MS;
  if (Math.abs(input.now - timestamp) > freshnessMs) {
    return { ok: false, reason: "stale" };
  }

  const expected = signServiceRequest(input.secret, timestamp);
  if (!signaturesMatch(expected, rawSignature)) {
    return { ok: false, reason: "invalidSignature" };
  }

  return { ok: true };
}

// Express middleware guarding the global change-feed route. Unlike
// createInternalAuthMiddleware, success attaches no auth context — there is
// no principal to scope this request to.
export function createInternalServiceAuthMiddleware(deps: {
  secret: string;
  freshnessMs?: number;
  now?: () => number;
}) {
  const now = deps.now ?? Date.now;
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = verifyServiceRequest({
      secret: deps.secret,
      headers: req.headers,
      now: now(),
      freshnessMs: deps.freshnessMs,
    });

    if (!result.ok) {
      res
        .status(Status.UNAUTHORIZED)
        .json({ error: "unauthorized", reason: result.reason });
      return;
    }

    next();
  };
}
