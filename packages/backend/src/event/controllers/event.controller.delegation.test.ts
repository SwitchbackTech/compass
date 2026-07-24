import { faker } from "@faker-js/faker";
import { type Response } from "express";
import { type SessionRequest } from "supertokens-node/framework/express";
import { CONFIG } from "@backend/common/constants/config.constants";
import eventController from "./event.controller";
import { afterEach, describe, expect, it, mock } from "bun:test";

const objectId = () => faker.database.mongodbObjectId();

// A session request stub carrying only what readAll reads.
const reqFor = (userId: string) =>
  ({
    session: { getUserId: () => userId },
    query: {
      start: "2026-07-14T00:00:00.000Z",
      end: "2026-07-21T00:00:00.000Z",
    },
  }) as unknown as SessionRequest;

describe("EventController.readAll event delegation", () => {
  const originalRouting = CONFIG.SYNC_EVENT_ROUTING;
  const originalServiceUrl = CONFIG.SYNC_SERVICE_URL;
  const originalToken = CONFIG.SYNC_INTERNAL_AUTH_TOKEN;

  afterEach(() => {
    CONFIG.SYNC_EVENT_ROUTING = originalRouting;
    CONFIG.SYNC_SERVICE_URL = originalServiceUrl;
    CONFIG.SYNC_INTERNAL_AUTH_TOKEN = originalToken;
  });

  it("delegates the event list to sync when event routing is sync", async () => {
    // Point at an unreachable sync service so the delegated read fails at the
    // fetch. The error response proves the SYNC branch ran (the legacy branch
    // reads the event store instead) AND that it fails closed rather than
    // silently falling back. This dedicated file gets its own test process, so
    // the lazy sync client singleton is built from the values set here rather
    // than the legacy default from another test.
    CONFIG.SYNC_SERVICE_URL = "http://sync.invalid:4999";
    CONFIG.SYNC_INTERNAL_AUTH_TOKEN = "test-sync-secret";
    CONFIG.SYNC_EVENT_ROUTING = "sync";

    const json = mock();
    const res = {
      status: mock().mockReturnThis(),
      json,
    } as unknown as Response;

    await eventController.readAll(reqFor(objectId()), res);

    // Fail-closed: sync unreachable -> error envelope, not a legacy empty list.
    expect(res.status).toHaveBeenCalled();
    const status = (res.status as ReturnType<typeof mock>).mock.calls[0]?.[0];
    expect(status).not.toBe(200);
    expect(json).toHaveBeenCalled();
  });
});
