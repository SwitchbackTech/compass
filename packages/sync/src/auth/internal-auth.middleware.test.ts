import { faker } from "@faker-js/faker";
import express, { type Server } from "express";
import {
  createInternalAuthMiddleware,
  INTERNAL_AUTH_HEADERS,
  type InternalAuthedRequest,
  signInternalRequest,
} from "@sync/auth/internal-auth";
import { type AddressInfo } from "node:net";

const SECRET = "internal-service-secret";
const FIXED_NOW = 2_000_000;

const objectId = () => faker.database.mongodbObjectId();

// A tiny app that mounts the middleware on an internal route and echoes back
// the server-derived auth context, so we can prove the context comes from the
// signed headers and never from the request body.
function buildProbeApp(): Server {
  const app = express();
  app.use(express.json());
  const guard = createInternalAuthMiddleware({
    secret: SECRET,
    now: () => FIXED_NOW,
  });
  app.post("/internal/echo", guard, (req, res) => {
    const { syncAuth } = req as InternalAuthedRequest;
    res.status(200).json({ context: syncAuth });
  });
  return app.listen(0);
}

function baseUrl(server: Server): string {
  const { port } = server.address() as AddressInfo;
  return `http://127.0.0.1:${port}`;
}

const validHeaders = (tenantId: string, principalId: string) => ({
  [INTERNAL_AUTH_HEADERS.tenant]: tenantId,
  [INTERNAL_AUTH_HEADERS.principal]: principalId,
  [INTERNAL_AUTH_HEADERS.timestamp]: String(FIXED_NOW),
  [INTERNAL_AUTH_HEADERS.signature]: signInternalRequest(SECRET, {
    timestamp: FIXED_NOW,
    tenantId,
    principalId,
  }),
  "content-type": "application/json",
});

describe("internal auth middleware", () => {
  let server: Server;

  beforeEach(() => {
    server = buildProbeApp();
  });

  afterEach(() => {
    server.close();
  });

  it("allows a correctly signed request and exposes the signed context", async () => {
    const tenantId = objectId();
    const principalId = objectId();
    const res = await fetch(`${baseUrl(server)}/internal/echo`, {
      method: "POST",
      headers: validHeaders(tenantId, principalId),
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ context: { tenantId, principalId } });
  });

  it("rejects an unsigned request with 401", async () => {
    const res = await fetch(`${baseUrl(server)}/internal/echo`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(401);
  });

  it("ignores a conflicting principal in the request body (ownership is server-derived)", async () => {
    const tenantId = objectId();
    const signedPrincipal = objectId();
    const forgedPrincipal = objectId();

    const res = await fetch(`${baseUrl(server)}/internal/echo`, {
      method: "POST",
      headers: validHeaders(tenantId, signedPrincipal),
      // The body tries to claim a different principal; it must be ignored.
      body: JSON.stringify({ principalId: forgedPrincipal, tenantId }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      context: { principalId: string };
    };
    expect(body.context.principalId).toBe(signedPrincipal);
    expect(body.context.principalId).not.toBe(forgedPrincipal);
  });

  it("rejects a request signed for one tenant but presenting another tenant header", async () => {
    const signedTenant = objectId();
    const principalId = objectId();
    const headers = validHeaders(signedTenant, principalId);
    // Swap the tenant header to a different tenant after signing (cross-tenant
    // attempt) — the signature no longer matches.
    headers[INTERNAL_AUTH_HEADERS.tenant] = objectId();

    const res = await fetch(`${baseUrl(server)}/internal/echo`, {
      method: "POST",
      headers,
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(401);
  });
});
