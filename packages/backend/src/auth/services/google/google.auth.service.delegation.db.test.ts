import { faker } from "@faker-js/faker";
import { type Credentials } from "google-auth-library";
import { UserDriver } from "@backend/__tests__/drivers/user.driver";
import {
  cleanupCollections,
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import GoogleOAuthClient from "@backend/auth/services/google/clients/google.oauth.client";
import { CONFIG } from "@backend/common/constants/config.constants";
import { googleCalendarSyncService } from "@backend/sync/services/google-sync/google-sync.service";
import { googleAuthService } from "./google.auth.service";
import { afterAll, beforeEach, describe, expect, it, spyOn } from "bun:test";

// A connection Sync owns must not also run the legacy engine's background
// sync — otherwise both engines import/watch the same Google account at
// once (2026-07-29 finding while wiring self-host sync-by-default: this
// happened on every sign-in under connectionRouting=sync, unnoticed because
// nothing asserted on it). Dedicated file for its own test process, so the
// lazy sync-client singleton (sync-service.factory.ts) is built from these
// CONFIG values rather than a legacy default already cached by another file.
const enableSyncDelegation = () => {
  CONFIG.SYNC_SERVICE_URL = "http://sync.invalid:4999";
  CONFIG.SYNC_INTERNAL_AUTH_TOKEN = "test-sync-secret";
};

describe("googleAuthService legacy-engine gating under connection delegation", () => {
  beforeEach(() => setupTestDb(import.meta.url));
  beforeEach(cleanupCollections);
  // The shared backend test harness (mock.setup.ts's mockNodeModules, wired
  // via the preload) registers its OWN beforeEach that resets the whole
  // CONFIG object to a pre-captured baseline before every test — running
  // AFTER a describe-scoped beforeAll but BEFORE each test body. So a
  // beforeAll-only override here would get silently wiped before test 1 even
  // runs; enableSyncDelegation must be in beforeEach (this file's own,
  // registered after the harness's) to survive to the test body. Once the
  // getSyncServiceClient() singleton is first computed (inside test 1) with
  // these values, it stays cached for the rest of the file/process — which
  // is what every test here wants anyway (steady "sync" delegation).
  beforeEach(enableSyncDelegation);
  afterAll(cleanupTestDb);

  it("googleSignup does not start the legacy engine", async () => {
    const startSpy = spyOn(
      googleCalendarSyncService,
      "startGoogleCalendarSyncIfNeeded",
    ).mockResolvedValue();
    const gUser = UserDriver.generateGoogleUser();
    const userId = faker.database.mongodbObjectId();

    await googleAuthService.googleSignup(gUser, faker.string.uuid(), userId);

    expect(startSpy).not.toHaveBeenCalled();
    startSpy.mockRestore();
  });

  it("repairGoogleConnection persists the reconnect but does not start the legacy engine", async () => {
    const user = await UserDriver.createUser();
    const compassUserId = user._id.toString();
    const gUser = UserDriver.generateGoogleUser({
      email: user.email,
      sub: faker.string.uuid(),
    });
    const oAuthTokens: Pick<Credentials, "access_token" | "refresh_token"> = {
      access_token: faker.internet.jwt(),
      refresh_token: faker.string.uuid(),
    };
    const startSpy = spyOn(
      googleCalendarSyncService,
      "startGoogleCalendarSyncIfNeeded",
    ).mockResolvedValue();

    const result = await googleAuthService.repairGoogleConnection(
      compassUserId,
      gUser,
      oAuthTokens,
    );

    // The reconnect itself (identity/profile persistence) is unaffected —
    // only the legacy background-sync side effect is gated.
    expect(result).toEqual({ cUserId: compassUserId });
    expect(startSpy).not.toHaveBeenCalled();
    startSpy.mockRestore();
  });

  it("googleSignin updates the profile but does not run the legacy incremental sync", async () => {
    const user = await UserDriver.createUser();
    const compassUserId = user._id.toString();
    const providerUser = UserDriver.generateGoogleUser({
      sub: user.google?.googleId,
    });
    const importSpy = spyOn(
      googleCalendarSyncService,
      "importLatestGoogleCalendarChanges",
    ).mockResolvedValue(undefined);

    const result = await googleAuthService.googleSignin(providerUser, {
      access_token: faker.internet.jwt(),
    });

    expect(result).toEqual({ cUserId: compassUserId });
    expect(importSpy).not.toHaveBeenCalled();
    importSpy.mockRestore();
  });

  it("connectGoogleToCurrentUser (the legacy connect endpoint) also stays silent under sync delegation", async () => {
    // This endpoint is only reached from the web app when connect is NOT
    // sync-delegated (the web fork uses the redirect flow instead), but the
    // backend-side gate is shared with sign-in — assert it holds here too.
    const user = await UserDriver.createUser({ withGoogle: false });
    const normalizedEmail = user.email.toLowerCase();
    const compassUserId = user._id.toString();
    const gUser = UserDriver.generateGoogleUser({
      email: normalizedEmail,
      sub: faker.string.uuid(),
    });
    const startSpy = spyOn(
      googleCalendarSyncService,
      "startGoogleCalendarSyncIfNeeded",
    ).mockResolvedValue();
    const exchangeSpy = spyOn(
      GoogleOAuthClient.prototype,
      "exchangeAuthCode",
    ).mockResolvedValue({
      gUser,
      tokens: {
        access_token: faker.internet.jwt(),
        refresh_token: faker.string.uuid(),
      },
    } as never);

    const result = await googleAuthService.connectGoogleToCurrentUser(
      compassUserId,
      {
        clientType: "web",
        thirdPartyId: "google",
        redirectURIInfo: {
          redirectURIOnProviderDashboard: "http://localhost:9080",
          redirectURIQueryParams: { code: "auth-code" },
        },
      },
    );

    expect(result).toEqual({ cUserId: compassUserId });
    expect(startSpy).not.toHaveBeenCalled();
    exchangeSpy.mockRestore();
    startSpy.mockRestore();
  });
});
