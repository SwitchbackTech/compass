import { faker } from "@faker-js/faker";
import { type SessionRequest } from "supertokens-node/framework/express";
import { CONFIG } from "@backend/common/constants/config.constants";
import { type Res_Promise } from "@backend/common/types/express.types";
import calendarController from "./calendar.controller";
import { afterEach, describe, expect, it } from "bun:test";

const objectId = () => faker.database.mongodbObjectId();

// A session request stub carrying only what list() reads.
const reqFor = (userId: string) =>
  ({
    session: { getUserId: () => userId },
    query: {},
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
