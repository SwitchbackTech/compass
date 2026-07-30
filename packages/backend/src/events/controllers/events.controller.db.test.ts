import { type Request, type Response } from "express";
import {
  cleanupCollections,
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import { initSupertokens } from "@backend/common/middleware/supertokens.middleware";
import eventsController from "@backend/events/controllers/events.controller";
import userService from "@backend/user/services/user.service";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  mock,
  spyOn,
} from "bun:test";

describe("EventsController", () => {
  beforeAll(initSupertokens);
  beforeEach(() => setupTestDb(import.meta.url));
  beforeEach(cleanupCollections);
  afterAll(cleanupTestDb);

  it("fire-and-forgets a lastSeenAt touch after subscribing and replaying metadata (A40)", async () => {
    const userId = "507f1f77bcf86cd799439013";
    const touchSpy = spyOn(userService, "touchLastSeenAt");

    const req = {
      session: { getUserId: () => userId },
      on: mock(),
    } as unknown as Request;
    const res = {
      setHeader: mock(),
      flushHeaders: mock(),
      write: mock(),
      status: mock().mockReturnThis(),
      end: mock(),
      headersSent: false,
    } as unknown as Response;

    await eventsController.streamEvents(req, res);

    expect(touchSpy).toHaveBeenCalledWith(userId);
  });

  it("does not let a lastSeenAt touch failure affect the SSE response", async () => {
    const userId = "507f1f77bcf86cd799439014";
    spyOn(userService, "touchLastSeenAt").mockImplementation(() =>
      Promise.reject(new Error("simulated touch failure")),
    );

    const req = {
      session: { getUserId: () => userId },
      on: mock(),
    } as unknown as Request;
    const res = {
      setHeader: mock(),
      flushHeaders: mock(),
      write: mock(),
      status: mock().mockReturnThis(),
      end: mock(),
      headersSent: false,
    } as unknown as Response;

    await expect(
      eventsController.streamEvents(req, res),
    ).resolves.toBeUndefined();
    expect(res.status).not.toHaveBeenCalled();

    // Let the fire-and-forget rejection's .catch handler settle so it
    // doesn't surface as an unhandled rejection in a later test.
    await new Promise((resolve) => setImmediate(resolve));
  });
});
