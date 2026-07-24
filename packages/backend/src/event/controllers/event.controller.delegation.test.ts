import { faker } from "@faker-js/faker";
import { type Response } from "express";
import { type SessionRequest } from "supertokens-node/framework/express";
import { CONFIG } from "@backend/common/constants/config.constants";
import eventController from "./event.controller";
import { afterEach, beforeAll, describe, expect, it, mock } from "bun:test";

const objectId = () => faker.database.mongodbObjectId();

const sessionReq = (userId: string, extras: Partial<SessionRequest> = {}) =>
  ({
    session: { getUserId: () => userId },
    query: {},
    params: {},
    body: {},
    ...extras,
  }) as unknown as SessionRequest;

const jsonRes = () => {
  const json = mock();
  const res = {
    status: mock().mockReturnThis(),
    json,
    send: mock().mockReturnThis(),
  } as unknown as Response;
  return { res, json };
};

const enableSyncDelegation = () => {
  // Point at an unreachable sync service so delegated calls fail at fetch.
  // Proves the SYNC branch ran (legacy would hit the event store) AND that
  // it fails closed — never falls back. This dedicated file gets its own
  // test process, so the lazy sync client singleton is built from these
  // values rather than a legacy default from another file.
  CONFIG.SYNC_SERVICE_URL = "http://sync.invalid:4999";
  CONFIG.SYNC_INTERNAL_AUTH_TOKEN = "test-sync-secret";
  CONFIG.SYNC_EVENT_ROUTING = "sync";
};

describe("EventController event delegation", () => {
  const originalRouting = CONFIG.SYNC_EVENT_ROUTING;
  const originalServiceUrl = CONFIG.SYNC_SERVICE_URL;
  const originalToken = CONFIG.SYNC_INTERNAL_AUTH_TOKEN;

  beforeAll(() => {
    enableSyncDelegation();
  });

  afterEach(() => {
    CONFIG.SYNC_EVENT_ROUTING = originalRouting;
    CONFIG.SYNC_SERVICE_URL = originalServiceUrl;
    CONFIG.SYNC_INTERNAL_AUTH_TOKEN = originalToken;
    // Re-enable for the next test in this file (singleton already primed).
    enableSyncDelegation();
  });

  it("delegates the event list to sync when event routing is sync", async () => {
    const { res, json } = jsonRes();
    await eventController.readAll(
      sessionReq(objectId(), {
        query: {
          start: "2026-07-14T00:00:00.000Z",
          end: "2026-07-21T00:00:00.000Z",
        },
      }),
      res,
    );

    const status = (res.status as ReturnType<typeof mock>).mock.calls[0]?.[0];
    expect(status).not.toBe(200);
    expect(json).toHaveBeenCalled();
  });

  it("delegates create to sync and fails closed (no legacy fallback)", async () => {
    const { res, json } = jsonRes();
    await eventController.create(
      sessionReq(objectId(), {
        body: {
          id: objectId(),
          calendarId: objectId(),
          content: { kind: "details", title: "Lunch", description: "" },
          schedule: {
            kind: "timed",
            start: "2026-07-14T12:00:00.000Z",
            end: "2026-07-14T13:00:00.000Z",
            timeZone: "UTC",
          },
          recurrence: { kind: "single" },
        },
      }),
      res,
    );

    const status = (res.status as ReturnType<typeof mock>).mock.calls[0]?.[0];
    expect(status).not.toBe(200);
    expect(json).toHaveBeenCalled();
  });

  it("delegates replace to sync and fails closed (no legacy fallback)", async () => {
    const { res, json } = jsonRes();
    await eventController.replace(
      sessionReq(objectId(), {
        params: { id: objectId() },
        body: {
          content: { kind: "details", title: "Renamed", description: "" },
          schedule: {
            kind: "timed",
            start: "2026-07-14T12:00:00.000Z",
            end: "2026-07-14T13:00:00.000Z",
            timeZone: "UTC",
          },
          recurrence: { kind: "preserve" },
          scope: "this",
        },
      }),
      res,
    );

    const status = (res.status as ReturnType<typeof mock>).mock.calls[0]?.[0];
    expect(status).not.toBe(200);
    expect(json).toHaveBeenCalled();
  });

  it("delegates delete to sync and fails closed (no legacy fallback)", async () => {
    const { res, json } = jsonRes();
    await eventController.delete(
      sessionReq(objectId(), {
        params: { id: objectId() },
        query: { scope: "this" },
      }),
      res,
    );

    const status = (res.status as ReturnType<typeof mock>).mock.calls[0]?.[0];
    expect(status).not.toBe(204);
    expect(status).not.toBe(200);
    expect(json).toHaveBeenCalled();
  });
});
