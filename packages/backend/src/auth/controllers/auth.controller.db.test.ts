import { Status } from "@core/errors/status.codes";
import { BaseDriver } from "@backend/__tests__/drivers/base.driver";
import { UtilDriver } from "@backend/__tests__/drivers/util.driver";
import {
  cleanupCollections,
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import { restoreFileMocks } from "@backend/__tests__/helpers/mock.setup";
import { CONFIG } from "@backend/common/constants/config.constants";
import * as syncServiceFactory from "@backend/common/services/sync-service/sync-service.factory";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  spyOn,
} from "bun:test";

const AUTHORIZATION_URL = "https://accounts.google.com/o/oauth2/v2/auth";

describe("auth.controller connections API", () => {
  const baseDriver = new BaseDriver();
  const originalMicrosoftId = CONFIG.MICROSOFT_CLIENT_ID;
  const originalMicrosoftSecret = CONFIG.MICROSOFT_CLIENT_SECRET;

  beforeAll(() => setupTestDb(import.meta.url));
  beforeEach(cleanupCollections);
  afterAll(cleanupTestDb);

  afterEach(() => {
    CONFIG.MICROSOFT_CLIENT_ID = originalMicrosoftId;
    CONFIG.MICROSOFT_CLIENT_SECRET = originalMicrosoftSecret;
    restoreFileMocks();
  });

  const sessionFor = (userId: string) =>
    baseDriver.setSessionPlugin({ userId });

  it("returns the same redirect body from the new begin route and the Google alias", async () => {
    const { user } = await UtilDriver.setupTestUser();
    spyOn(syncServiceFactory, "getSyncServiceClient").mockReturnValue({
      beginConnection: async () => ({
        ok: true,
        value: { authorizationUrl: AUTHORIZATION_URL },
        correlationId: "corr-1",
      }),
    } as never);

    const expected = {
      kind: "redirect",
      authorizationUrl: AUTHORIZATION_URL,
    };

    const next = await baseDriver
      .getServer()
      .post("/api/auth/connections/begin")
      .use(sessionFor(user._id.toString()))
      .send({ provider: "google" })
      .expect(Status.OK);

    const alias = await baseDriver
      .getServer()
      .post("/api/auth/google/connect/begin")
      .use(sessionFor(user._id.toString()))
      .send({})
      .expect(Status.OK);

    expect(next.body).toEqual(expected);
    expect(alias.body).toEqual(expected);
  });

  it("returns 409 PROVIDER_NOT_CONFIGURED for microsoft on a Google-only deployment", async () => {
    CONFIG.MICROSOFT_CLIENT_ID = undefined;
    CONFIG.MICROSOFT_CLIENT_SECRET = undefined;
    const { user } = await UtilDriver.setupTestUser();
    const beginConnection = spyOn(syncServiceFactory, "getSyncServiceClient");

    const response = await baseDriver
      .getServer()
      .post("/api/auth/connections/begin")
      .use(sessionFor(user._id.toString()))
      .send({ provider: "microsoft" })
      .expect(Status.CONFLICT);

    expect(response.body.code).toBe("PROVIDER_NOT_CONFIGURED");
    expect(response.body.message).toContain("Microsoft");
    expect(beginConnection).not.toHaveBeenCalled();
  });
});
