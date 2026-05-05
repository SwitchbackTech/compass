import { Resource_Sync } from "@core/types/sync.types";
import { GoogleWatchDriver } from "@backend/__tests__/drivers/google-watch.driver";
import { UserDriver } from "@backend/__tests__/drivers/user.driver";
import { UtilDriver } from "@backend/__tests__/drivers/util.driver";
import {
  cleanupCollections,
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import { initSupertokens } from "@backend/common/middleware/supertokens.middleware";
import { updateSync } from "@backend/sync/services/records/sync-records.repository";
import { isUsingGcalWebhookHttps } from "@backend/sync/services/watch/google-watch-config";
import { isGoogleCalendarSyncHealthy } from "./google-sync.health";

jest.mock("@backend/sync/services/watch/google-watch-config", () => ({
  ...jest.requireActual("@backend/sync/services/watch/google-watch-config"),
  isUsingGcalWebhookHttps: jest.fn(() => true),
}));

describe("googleSyncHealth", () => {
  beforeAll(initSupertokens);
  beforeAll(setupTestDb);
  beforeEach(() => {
    (isUsingGcalWebhookHttps as jest.Mock).mockReturnValue(true);
  });
  beforeEach(cleanupCollections);
  afterEach(() => jest.restoreAllMocks());
  afterAll(cleanupTestDb);

  it("returns false when the user has no sync record", async () => {
    const user = await UserDriver.createUser();

    await expect(
      isGoogleCalendarSyncHealthy(user._id.toString()),
    ).resolves.toBe(false);
  });

  it("returns true when sync records and active Google Watches are present", async () => {
    const { user } = await UtilDriver.setupTestUser();

    await expect(
      isGoogleCalendarSyncHealthy(user._id.toString()),
    ).resolves.toBe(true);
  });

  it("returns false when a calendar event sync token is missing", async () => {
    const { user } = await UtilDriver.setupTestUser();
    const userId = user._id.toString();

    await updateSync(Resource_Sync.EVENTS, userId, "test-calendar", {
      nextSyncToken: undefined,
    });

    await expect(isGoogleCalendarSyncHealthy(userId)).resolves.toBe(false);
  });

  it("returns true without active watches when Public watch notifications are not using HTTPS", async () => {
    const { user } = await UtilDriver.setupTestUser();
    const userId = user._id.toString();

    (isUsingGcalWebhookHttps as jest.Mock).mockReturnValue(false);
    await GoogleWatchDriver.removeActiveGoogleWatchesForUser(userId);

    await expect(isGoogleCalendarSyncHealthy(userId)).resolves.toBe(true);
  });

  it("returns false without active watches when Public watch notifications are using HTTPS", async () => {
    const { user } = await UtilDriver.setupTestUser();
    const userId = user._id.toString();

    (isUsingGcalWebhookHttps as jest.Mock).mockReturnValue(true);
    await GoogleWatchDriver.removeActiveGoogleWatchesForUser(userId);

    await expect(isGoogleCalendarSyncHealthy(userId)).resolves.toBe(false);
  });
});
