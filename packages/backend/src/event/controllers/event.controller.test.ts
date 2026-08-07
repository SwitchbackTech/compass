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
  beforeEach,
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
  content: { kind: "details", title: "Lunch", description: "", location: "" },
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

const pointAtUnreachableSync = () => {
  // Point at an unreachable sync service so calls that aren't mocked below
  // fail at fetch, proving the controller fails closed on a sync outage
  // rather than silently returning empty/success. This dedicated file gets
  // its own test process, so the lazy sync client singleton is built from
  // these values rather than a default from another file.
  CONFIG.SYNC_SERVICE_URL = "http://sync.invalid:4999";
  CONFIG.SYNC_INTERNAL_AUTH_TOKEN = "test-sync-secret";
};

describe("EventController", () => {
  // The shared backend harness's global beforeEach (mock.setup.ts) resets
  // CONFIG to its file-load baseline before every test body runs, which
  // would wipe a beforeAll-set override. Use beforeEach here so this runs
  // after that reset, not before it.
  beforeEach(() => {
    pointAtUnreachableSync();
  });

  afterEach(() => {
    mock.restore();
  });

  it("fails closed on a sync outage when listing events", async () => {
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

  it("resolves owned calendars for a read with activeOnly, never the full list", async () => {
    // resolveSyncCalendarIds intersects the request's calendarIds against
    // "owned" ids — but while the browser's own calendar list is still
    // loading, it sends NO calendarIds at all (undefined), and the backend
    // answers with every owned id verbatim. That call must already be scoped
    // to active calendars, or a retired calendar's events get read on every
    // page load that races the calendars query. The listCalendars stub
    // asserts the activeOnly option below.
    const activeCalendarId = objectId();
    spyOn(calendarService, "getLocalCalendar").mockResolvedValue(null);
    const listFullEvents = mock(() =>
      Promise.resolve({
        ok: true as const,
        value: { instances: [], nextCursor: null },
      }),
    );
    const listCalendars = mock(() =>
      Promise.resolve({
        ok: true as const,
        value: { calendars: [{ id: activeCalendarId }] },
      }),
    );
    spyOn(syncServiceFactory, "getSyncServiceClient").mockReturnValue({
      listCalendars,
      listFullEvents,
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

    expect(res.status).toHaveBeenCalledWith(Status.OK);
    expect(json).toHaveBeenCalledWith({ events: [] });
    expect(listFullEvents).toHaveBeenCalledTimes(1);
    // The ownership read must be scoped to active calendars.
    expect(listCalendars.mock.calls[0]?.[1]).toEqual({ activeOnly: true });
    const pageQuery = (
      listFullEvents.mock.calls[0] as never as [
        unknown,
        { calendarIds: string[] },
      ]
    )[1];
    expect(pageQuery.calendarIds).toEqual([activeCalendarId]);
  });

  it("rejects a calendar move before submitting anything to sync", async () => {
    // toReplaceSubmitRequests would build an update command plus a move
    // command when calendarId is present, but sync unconditionally fails
    // every move (no executor exists) - submitting them in sequence would
    // apply the update, then throw on the move: a partial write. This must
    // never reach sync at all.
    const submitCommand = mock();
    spyOn(syncServiceFactory, "getSyncServiceClient").mockReturnValue({
      submitCommand,
    } as never);

    const { res, json } = jsonRes();
    await eventController.replace(
      sessionReq(objectId(), {
        params: { id: objectId() },
        body: {
          calendarId: objectId(),
          content: {
            kind: "details",
            title: "Lunch",
            description: "",
            location: "",
          },
          schedule: {
            kind: "timed",
            start: "2026-07-14T12:00:00.000Z",
            end: "2026-07-14T13:00:00.000Z",
            timeZone: "UTC",
          },
          recurrence: { kind: "single" },
          scope: "all",
        },
      }),
      res,
    );

    expect(res.status).toHaveBeenCalledWith(Status.BAD_REQUEST);
    expect(json).toHaveBeenCalledWith({
      code: "MOVE_UNSUPPORTED",
      message: "Moving an event to a different calendar is not supported yet",
      retryable: false,
    });
    expect(submitCommand).not.toHaveBeenCalled();
  });

  it("fails closed on a sync outage when creating an event", async () => {
    const { res, json } = jsonRes();
    await eventController.create(
      sessionReq(objectId(), {
        body: {
          id: objectId(),
          calendarId: objectId(),
          content: {
            kind: "details",
            title: "Lunch",
            description: "",
            location: "",
          },
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

  it("rejects an unrecognized content key as 400 INVALID_INPUT, not a provider failure", async () => {
    const { res, json } = jsonRes();
    await eventController.create(
      sessionReq(objectId(), {
        body: {
          ...sampleCreateBody(),
          content: {
            ...sampleCreateBody().content,
            // Read-shaped fields a round-tripped event carries that the
            // strict write schema never accepts - see EditableContentSchema.
            organizer: { email: "host@example.com", displayName: null },
            attendees: [],
            conference: null,
          },
        },
      }),
      res,
    );

    expect(res.status).toHaveBeenCalledWith(Status.BAD_REQUEST);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ code: "INVALID_INPUT", retryable: false }),
    );
  });

  it("fails closed on a sync outage when replacing an event", async () => {
    const { res, json } = jsonRes();
    await eventController.replace(
      sessionReq(objectId(), {
        params: { id: objectId() },
        body: {
          content: {
            kind: "details",
            title: "Renamed",
            description: "",
            location: "",
          },
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

  it("fails closed on a sync outage when deleting an event", async () => {
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

  it("maps authorizationRevoked to 410 GOOGLE_REVOKED (not retryable)", async () => {
    mockSyncCommandFailure("authorizationRevoked");
    const { res, json } = await createViaSync();

    expect((res.status as ReturnType<typeof mock>).mock.calls[0]?.[0]).toBe(
      Status.GONE,
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

  // The regression lock for invariant 1 ("every write resolves
  // definitively"): a command sync leaves non-terminal must never read as
  // success here. Before this fix, a still-pending outcome returned 200 —
  // the client applied the change optimistically, then a later refetch
  // silently reverted it with no error ever shown ("my delete came back").
  it("fails a still-pending outcome as a retryable PROVIDER_FAILURE, never as success", async () => {
    spyOn(syncServiceFactory, "getSyncServiceClient").mockReturnValue({
      submitCommand: mock(() =>
        Promise.resolve({
          ok: true as const,
          value: { command: { outcome: { state: "pending" as const } } },
        }),
      ),
    } as never);
    const { res, json } = await createViaSync();

    const status = (res.status as ReturnType<typeof mock>).mock.calls[0]?.[0];
    expect(status).not.toBe(200);
    expect(status).toBe(502);
    expect(json).toHaveBeenCalledWith({
      code: "PROVIDER_FAILURE",
      message: "Sync command did not resolve (pending)",
      retryable: true,
    });
  });
});
