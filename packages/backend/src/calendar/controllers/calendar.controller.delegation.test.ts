import { faker } from "@faker-js/faker";
import { type SessionRequest } from "supertokens-node/framework/express";
import { CONFIG } from "@backend/common/constants/config.constants";
import * as syncServiceFactory from "@backend/common/services/sync-service/sync-service.factory";
import { type Res_Promise } from "@backend/common/types/express.types";
import calendarController from "./calendar.controller";
import { afterEach, describe, expect, it, mock, spyOn } from "bun:test";

const objectId = () => faker.database.mongodbObjectId();

// A session request stub carrying only what list() reads.
const reqFor = (userId: string) =>
  ({
    session: { getUserId: () => userId },
    query: {},
  }) as unknown as SessionRequest;

const availabilityReqFor = (userId: string, calendarIds: string[]) =>
  ({
    session: { getUserId: () => userId },
    query: {
      calendarIds: calendarIds.join(","),
      start: "2026-07-14T00:00:00.000Z",
      end: "2026-07-14T23:59:59.000Z",
    },
  }) as unknown as SessionRequest;

// Capture the promise the controller hands to res.promise so the test can
// observe whether it resolved or rejected.
const capturingRes = () => {
  let settled: Promise<unknown> | undefined;
  const res = {
    promise: (value: unknown) => {
      settled = Promise.resolve(value);
    },
  } as unknown as Res_Promise;
  return { res, settled: () => settled };
};

describe("CalendarController.list event delegation", () => {
  const originalRouting = CONFIG.SYNC_EVENT_ROUTING;
  const originalServiceUrl = CONFIG.SYNC_SERVICE_URL;
  const originalToken = CONFIG.SYNC_INTERNAL_AUTH_TOKEN;

  afterEach(() => {
    CONFIG.SYNC_EVENT_ROUTING = originalRouting;
    CONFIG.SYNC_SERVICE_URL = originalServiceUrl;
    CONFIG.SYNC_INTERNAL_AUTH_TOKEN = originalToken;
  });

  it("delegates the calendar list to sync when event routing is sync", async () => {
    // Point at an unreachable sync service so the delegated read fails at the
    // fetch. The rejection proves the SYNC branch ran (the legacy branch reads
    // the calendar store instead) AND that it fails closed rather than silently
    // returning an empty calendar list. This dedicated file gets its own test
    // process, so the lazy sync client singleton is built from the values set
    // here rather than the legacy default from another test.
    CONFIG.SYNC_SERVICE_URL = "http://sync.invalid:4999";
    CONFIG.SYNC_INTERNAL_AUTH_TOKEN = "test-sync-secret";
    CONFIG.SYNC_EVENT_ROUTING = "sync";

    const { res, settled } = capturingRes();
    await calendarController.list(reqFor(objectId()), res);

    await expect(settled()).rejects.toThrow();
  });
});

describe("CalendarController.availability event delegation", () => {
  const originalRouting = CONFIG.SYNC_EVENT_ROUTING;
  const originalServiceUrl = CONFIG.SYNC_SERVICE_URL;
  const originalToken = CONFIG.SYNC_INTERNAL_AUTH_TOKEN;

  afterEach(() => {
    CONFIG.SYNC_EVENT_ROUTING = originalRouting;
    CONFIG.SYNC_SERVICE_URL = originalServiceUrl;
    CONFIG.SYNC_INTERNAL_AUTH_TOKEN = originalToken;
    mock.restore();
  });

  it("delegates availability to sync and fails closed on a sync outage (no legacy fallback)", async () => {
    CONFIG.SYNC_SERVICE_URL = "http://sync.invalid:4999";
    CONFIG.SYNC_INTERNAL_AUTH_TOKEN = "test-sync-secret";
    CONFIG.SYNC_EVENT_ROUTING = "sync";

    const { res, settled } = capturingRes();
    await calendarController.availability(
      availabilityReqFor(objectId(), [objectId()]),
      res,
    );

    await expect(settled()).rejects.toThrow();
  });

  it("queries each calendar separately and attributes intervals to their real calendarId", async () => {
    // The day-grid layout positions a busy block by calendarId and drops
    // blocks for calendars it doesn't recognize — a merged, single-attributed
    // response would silently lose busy time for every calendar but one.
    // This asserts each requested calendar is queried on its own and its
    // intervals keep their own, correct calendarId in the response.
    CONFIG.SYNC_SERVICE_URL = "http://sync.invalid:4999";
    CONFIG.SYNC_INTERNAL_AUTH_TOKEN = "test-sync-secret";
    CONFIG.SYNC_EVENT_ROUTING = "sync";

    const [first, second] = [objectId(), objectId()];
    const queryBusyAvailability = mock(
      (_principal: unknown, request: { calendarIds: readonly string[] }) => {
        const requested = request.calendarIds[0];
        const intervals =
          requested === first
            ? [
                {
                  start: "2026-07-14T09:00:00.000Z",
                  end: "2026-07-14T10:00:00.000Z",
                },
              ]
            : [
                {
                  start: "2026-07-14T14:00:00.000Z",
                  end: "2026-07-14T15:00:00.000Z",
                },
              ];
        return Promise.resolve({
          ok: true as const,
          value: {
            intervals,
            computedAt: "2026-07-14T08:00:00.000Z",
            connections: [],
            complete: true,
            issues: [],
            bookable: true,
          },
        });
      },
    );
    spyOn(syncServiceFactory, "getSyncServiceClient").mockReturnValue({
      queryBusyAvailability,
    } as never);

    const { res, settled } = capturingRes();
    await calendarController.availability(
      availabilityReqFor(objectId(), [first, second]),
      res,
    );

    expect(queryBusyAvailability).toHaveBeenCalledTimes(2);
    await expect(settled()).resolves.toEqual({
      busyPeriods: [
        {
          calendarId: first,
          start: "2026-07-14T09:00:00.000Z",
          end: "2026-07-14T10:00:00.000Z",
        },
        {
          calendarId: second,
          start: "2026-07-14T14:00:00.000Z",
          end: "2026-07-14T15:00:00.000Z",
        },
      ],
    });
  });
});
