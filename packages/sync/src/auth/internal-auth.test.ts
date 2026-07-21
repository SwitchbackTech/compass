import { faker } from "@faker-js/faker";
import {
  DEFAULT_FRESHNESS_MS,
  INTERNAL_AUTH_HEADERS,
  signInternalRequest,
  verifyInternalRequest,
} from "@sync/auth/internal-auth";

const SECRET = "internal-service-secret";

const objectId = () => faker.database.mongodbObjectId();

const signedHeaders = (
  overrides: {
    secret?: string;
    tenantId?: string;
    principalId?: string;
    timestamp?: number;
  } = {},
) => {
  const tenantId = overrides.tenantId ?? objectId();
  const principalId = overrides.principalId ?? objectId();
  const timestamp = overrides.timestamp ?? 1_000_000;
  const signature = signInternalRequest(overrides.secret ?? SECRET, {
    timestamp,
    tenantId,
    principalId,
  });
  return {
    [INTERNAL_AUTH_HEADERS.tenant]: tenantId,
    [INTERNAL_AUTH_HEADERS.principal]: principalId,
    [INTERNAL_AUTH_HEADERS.timestamp]: String(timestamp),
    [INTERNAL_AUTH_HEADERS.signature]: signature,
  };
};

describe("verifyInternalRequest", () => {
  it("accepts a correctly signed, fresh request and derives context from signed headers", () => {
    const tenantId = objectId();
    const principalId = objectId();
    const headers = signedHeaders({
      tenantId,
      principalId,
      timestamp: 1_000_000,
    });

    const result = verifyInternalRequest({
      secret: SECRET,
      headers,
      now: 1_000_500,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.context.tenantId).toBe(tenantId);
      expect(result.context.principalId).toBe(principalId);
    }
  });

  it.each(
    Object.values(INTERNAL_AUTH_HEADERS),
  )("rejects a request missing the %s header", (missing) => {
    const headers = signedHeaders({ timestamp: 1_000_000 }) as Record<
      string,
      string
    >;
    delete headers[missing];
    const result = verifyInternalRequest({
      secret: SECRET,
      headers,
      now: 1_000_000,
    });
    expect(result).toEqual({ ok: false, reason: "missing" });
  });

  it("rejects a signature made with the wrong secret", () => {
    const headers = signedHeaders({
      secret: "attacker-secret",
      timestamp: 1000,
    });
    const result = verifyInternalRequest({
      secret: SECRET,
      headers,
      now: 1000,
    });
    expect(result).toEqual({ ok: false, reason: "invalidSignature" });
  });

  it("rejects a replayed request outside the freshness window", () => {
    const headers = signedHeaders({ timestamp: 1_000_000 });
    const result = verifyInternalRequest({
      secret: SECRET,
      headers,
      now: 1_000_000 + DEFAULT_FRESHNESS_MS + 1,
    });
    expect(result).toEqual({ ok: false, reason: "stale" });
  });

  it("accepts a request at the edge of the freshness window", () => {
    const headers = signedHeaders({ timestamp: 1_000_000 });
    const result = verifyInternalRequest({
      secret: SECRET,
      headers,
      now: 1_000_000 + DEFAULT_FRESHNESS_MS,
    });
    expect(result.ok).toBe(true);
  });

  it("rejects a tampered principal (signature covers identity)", () => {
    const headers = signedHeaders({ timestamp: 1000 });
    // Swap the principal to a different valid id after signing.
    headers[INTERNAL_AUTH_HEADERS.principal] = objectId();
    const result = verifyInternalRequest({
      secret: SECRET,
      headers,
      now: 1000,
    });
    expect(result).toEqual({ ok: false, reason: "invalidSignature" });
  });

  it("rejects a non-ObjectId tenant as malformed", () => {
    const headers = signedHeaders({ tenantId: "not-an-id", timestamp: 1000 });
    const result = verifyInternalRequest({
      secret: SECRET,
      headers,
      now: 1000,
    });
    expect(result).toEqual({ ok: false, reason: "malformed" });
  });

  it("rejects a non-numeric timestamp as malformed", () => {
    const headers = signedHeaders({ timestamp: 1000 });
    headers[INTERNAL_AUTH_HEADERS.timestamp] = "not-a-number";
    const result = verifyInternalRequest({
      secret: SECRET,
      headers,
      now: 1000,
    });
    expect(result).toEqual({ ok: false, reason: "malformed" });
  });

  it("rejects a wrong-length signature without throwing", () => {
    const headers = signedHeaders({ timestamp: 1000 });
    headers[INTERNAL_AUTH_HEADERS.signature] = "deadbeef";
    const result = verifyInternalRequest({
      secret: SECRET,
      headers,
      now: 1000,
    });
    expect(result).toEqual({ ok: false, reason: "invalidSignature" });
  });
});
