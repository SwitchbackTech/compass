import { faker } from "@faker-js/faker";
import { type Response } from "express";
import { type SessionRequest } from "supertokens-node/framework/express";
import { Status } from "@core/errors/status.codes";
import calendarService from "@backend/calendar/services/calendar.service";
import { CONFIG } from "@backend/common/constants/config.constants";
import * as syncServiceFactory from "@backend/common/services/sync-service/sync-service.factory";
import eventController from "./event.controller";
import {
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  mock,
  spyOn,
} from "bun:test";

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

const sampleCreateBody = () => ({
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
});

const mockSyncCommandFailure = (failureReason: string) => {
  spyOn(syncServiceFactory, "getSyncServiceClient").mockReturnValue({
    submitCommand: mock(() =>
      Promise.resolve({
        ok: true as const,
        value: {
          command: {
            outcome: {
              state: "failed" as const,
              failureReason,
            },
          },
        },
      }),
    ),
  } as never);
};

const createViaSync = async () => {
  const { res, json } = jsonRes();
  await eventController.create(
    sessionReq(objectId(), { body: sampleCreateBody() }),
    res,
  );
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
    mock.restore();
  });

  it("delegates the event list to sync when event routing is sync", async () => {
    spyOn(calendarService, "getLocalCalendar").mockResolvedValue(null);
    spyOn(syncServiceFactory, "getSyncServiceClient").mockReturnValue({
      listCalendars: mock(() =>
        Promise.resolve({
          ok: false as const,
          error: {
            kind: "unavailable" as const,
            correlationId: "corr-list",
          },
        }),
      ),
    } as never);

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
    // SyncClientError → retryable PROVIDER_FAILURE (502), not a generic 500.
    expect(status).toBe(Status.BAD_GATEWAY);
    expect(json).toHaveBeenCalledWith({
      code: "PROVIDER_FAILURE",
      message: "Failed to list calendars from sync (unavailable)",
      retryable: true,
    });
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

  it("maps authorizationRevoked to 401 GOOGLE_REVOKED (not retryable)", async () => {
    mockSyncCommandFailure("authorizationRevoked");
    const { res, json } = await createViaSync();

    expect((res.status as ReturnType<typeof mock>).mock.calls[0]?.[0]).toBe(
      Status.UNAUTHORIZED,
    );
    expect(json).toHaveBeenCalledWith({
      code: "GOOGLE_REVOKED",
      message:
        "Google Calendar access expired or was revoked. Reconnect Google Calendar in Compass to resume syncing.",
      retryable: false,
    });
  });

  it("maps permanentProviderError to 502 PROVIDER_FAILURE (retryable)", async () => {
    mockSyncCommandFailure("permanentProviderError");
    const { res, json } = await createViaSync();

    expect((res.status as ReturnType<typeof mock>).mock.calls[0]?.[0]).toBe(
      502,
    );
    expect(json).toHaveBeenCalledWith({
      code: "PROVIDER_FAILURE",
      message: "Sync command failed (permanentProviderError)",
      retryable: true,
    });
  });
});
