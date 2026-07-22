import { type Request, type Response } from "express";
import {
  cleanupCollections,
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import { initSupertokens } from "@backend/common/middleware/supertokens.middleware";
import eventsController from "@backend/events/controllers/events.controller";
import {
  type GoogleWatchRepairResult,
  googleWatchRepairService,
} from "@backend/sync/services/watch/google-watch-repair.service";
import { GoogleWatchStateStatus } from "@backend/sync/services/watch/google-watch-state";
import userService from "@backend/user/services/user.service";
import { , afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, mock, spyOn } from "bun:test";

describe("EventsController", () => {
  beforeAll(initSupertokens);
  beforeEach(() => setupTestDb(import.meta.url));
  beforeEach(cleanupCollections);
  afterAll(cleanupTestDb);

  it("11: fire-and-forgets the watch repair coordinator after subscribing and replaying metadata", async () => {
    const userId = "507f1f77bcf86cd799439011";
    const noneResult: GoogleWatchRepairResult = {
      action: "NONE",
      inspection: {
        status: GoogleWatchStateStatus.NOT_APPLICABLE,
        reason: "GOOGLE_NOT_CONNECTED",
        expectedWatchCalendarIds: [],
        activeWatches: [],
        duplicateWatches: [],
        expiredWatches: [],
        missingWatchCalendarIds: [],
        staleWatches: [],
        watchesToRefresh: [],
        incompleteCalendarIds: [],
      },
    };
    const repairSpy = jest
      .spyOn(googleWatchRepairService, "repairGoogleWatchesForUser")
      .mockResolvedValue(noneResult);

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

    expect(repairSpy).toHaveBeenCalledWith(userId);
  });

  it("does not let a repair failure affect the SSE response", async () => {
    const userId = "507f1f77bcf86cd799439012";
    jest
      .spyOn(googleWatchRepairService, "repairGoogleWatchesForUser")
      .mockImplementation(() =>
        Promise.reject(new Error("simulated repair failure")),
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

  it("fire-and-forgets a lastSeenAt touch alongside the repair coordinator (A40)", async () => {
    const userId = "507f1f77bcf86cd799439013";
    const noneResult: GoogleWatchRepairResult = {
      action: "NONE",
      inspection: {
        status: GoogleWatchStateStatus.NOT_APPLICABLE,
        reason: "GOOGLE_NOT_CONNECTED",
        expectedWatchCalendarIds: [],
        activeWatches: [],
        duplicateWatches: [],
        expiredWatches: [],
        missingWatchCalendarIds: [],
        staleWatches: [],
        watchesToRefresh: [],
        incompleteCalendarIds: [],
      },
    };
    jest
      .spyOn(googleWatchRepairService, "repairGoogleWatchesForUser")
      .mockResolvedValue(noneResult);
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
    jest
      .spyOn(googleWatchRepairService, "repairGoogleWatchesForUser")
      .mockResolvedValue({
        action: "NONE",
        inspection: {
          status: GoogleWatchStateStatus.NOT_APPLICABLE,
          reason: "GOOGLE_NOT_CONNECTED",
          expectedWatchCalendarIds: [],
          activeWatches: [],
          duplicateWatches: [],
          expiredWatches: [],
          missingWatchCalendarIds: [],
          staleWatches: [],
          watchesToRefresh: [],
          incompleteCalendarIds: [],
        },
      });
    jest
      .spyOn(userService, "touchLastSeenAt")
      .mockImplementation(() =>
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
