import { Status } from "@core/errors/status.codes";
import { BaseDriver } from "@backend/__tests__/drivers/base.driver";
import {
  cleanupCollections,
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "bun:test";

// The public booking API must be rate-limited per (ip, key): these routes are
// reachable without a session. Each test uses its own slug/id so the shared
// in-memory buckets cannot bleed between tests.
describe("Public booking rate limits", () => {
  const baseDriver = new BaseDriver();

  beforeAll(async () => {
    await setupTestDb(import.meta.url);
    await baseDriver.listen();
  });

  beforeEach(cleanupCollections);

  afterAll(async () => {
    await baseDriver.teardown();
    await cleanupTestDb();
  });

  it("throttles GET page-by-slug after 60 requests in a minute", async () => {
    const server = baseDriver.getServer();
    for (let i = 0; i < 60; i += 1) {
      await server
        .get("/api/booking/pages/limit-page-slug")
        .expect(Status.NOT_FOUND);
    }
    const throttled = await server.get("/api/booking/pages/limit-page-slug");
    expect(throttled.status).toBe(429);
  });

  it("throttles POST cancel after 10 requests in a minute", async () => {
    const server = baseDriver.getServer();
    const id = "0000000000000000000000aa";
    for (let i = 0; i < 10; i += 1) {
      await server
        .post(`/api/booking/reservations/${id}/cancel`)
        .send({ token: "a".repeat(64) })
        .expect(Status.NOT_FOUND);
    }
    const throttled = await server
      .post(`/api/booking/reservations/${id}/cancel`)
      .send({ token: "a".repeat(64) });
    expect(throttled.status).toBe(429);
  });

  it("does not throttle a different slug's bucket", async () => {
    const server = baseDriver.getServer();
    for (let i = 0; i < 61; i += 1) {
      await server.get("/api/booking/pages/busy-neighbor-slug");
    }
    await server
      .get("/api/booking/pages/quiet-neighbor-slug")
      .expect(Status.NOT_FOUND);
  });
});
