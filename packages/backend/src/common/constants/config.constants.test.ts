import { type CompassConfig } from "@core/config/compass.config";
import {
  parseConfigFromEnv,
  parseRawConfig,
} from "@backend/common/constants/config.constants";
import { isGoogleConfigured } from "@backend/common/constants/config.util";
import { describe, expect, it } from "bun:test";

// A minimal valid compass config file, mirroring the required fields
// parseRawConfig reads. Tests spread a `sync` section onto it.
const baseRawConfig: CompassConfig = {
  web: { url: "http://localhost:9080" },
  backend: {
    apiUrl: "http://localhost:3000/api",
    compassToken: "compass-token",
  },
  runtime: { nodeEnv: "development", timezone: "Etc/UTC" },
  mongo: { uri: "mongodb://localhost:27017/compass" },
  supertokens: { uri: "http://localhost:3567", key: "supertokens-key" },
};

const validEnv = {
  BASEURL: "http://localhost:3000/api",
  CHANNEL_EXPIRATION_MIN: "10",
  CORS: "http://localhost:9080",
  FRONTEND_URL: "http://localhost:9080",
  MONGO_URI: "mongodb://localhost:27017/compass",
  NODE_ENV: "development",
  PORT: "3000",
  SUPERTOKENS_KEY: "supertokens-key",
  SUPERTOKENS_URI: "http://localhost:3567",
  TOKEN_COMPASS_SYNC: "sync-token",
  TZ: "Etc/UTC",
};

describe("config.constants", () => {
  it("parses backend env without Google configuration", () => {
    const env = parseConfigFromEnv(validEnv);

    expect(env.GOOGLE_CLIENT_ID).toBeUndefined();
    expect(env.GOOGLE_CLIENT_SECRET).toBeUndefined();
    expect(env.TOKEN_GCAL_NOTIFICATION).toBe("");
    expect(isGoogleConfigured(env)).toBe(false);
  });

  it("falls back GCAL_WEBHOOK_BASEURL to BASEURL when not provided", () => {
    const env = parseConfigFromEnv(validEnv);

    expect(env.GCAL_WEBHOOK_BASEURL).toBe("http://localhost:3000/api");
  });

  it("defaults CHANNEL_EXPIRATION_MIN to 10080 minutes (7 days) when not provided (packet 07 step 11 pin)", () => {
    // The test env always overrides CHANNEL_EXPIRATION_MIN (see
    // backend.test.init.ts), so this pins the zod schema's own default
    // directly rather than asserting against a real channel watch.
    const env = parseConfigFromEnv({
      ...validEnv,
      CHANNEL_EXPIRATION_MIN: undefined,
    });

    expect(env.CHANNEL_EXPIRATION_MIN).toBe("10080");
  });

  it("falls back GCAL_WEBHOOK_BASEURL to BASEURL when blank", () => {
    const env = parseConfigFromEnv({ ...validEnv, GCAL_WEBHOOK_BASEURL: "" });

    expect(env.GCAL_WEBHOOK_BASEURL).toBe("http://localhost:3000/api");
  });

  it("rejects partially configured Google credentials", () => {
    expect(() =>
      parseConfigFromEnv({
        ...validEnv,
        GOOGLE_CLIENT_ID: "client-id",
      }),
    ).toThrow("Google configuration requires both client ID and secret");

    expect(() =>
      parseConfigFromEnv({
        ...validEnv,
        GOOGLE_CLIENT_SECRET: "client-secret",
      }),
    ).toThrow("Google configuration requires both client ID and secret");
  });

  it("reports Google as configured only when both usable credentials are present", () => {
    const env = parseConfigFromEnv({
      ...validEnv,
      BASEURL: "http://localhost:3000/api",
      GOOGLE_CLIENT_ID: "client-id",
      GOOGLE_CLIENT_SECRET: "client-secret",
    });

    expect(isGoogleConfigured(env)).toBe(true);
  });

  it("treats absent Google credentials as not configured", () => {
    const env = parseConfigFromEnv({
      ...validEnv,
      GOOGLE_CLIENT_ID: undefined,
      GOOGLE_CLIENT_SECRET: undefined,
    });

    expect(isGoogleConfigured(env)).toBe(false);
  });

  it("requires a Google notification token for HTTPS Google watch callbacks", () => {
    expect(() =>
      parseConfigFromEnv({
        ...validEnv,
        BASEURL: "https://api.example.com/api",
        GOOGLE_CLIENT_ID: "client-id",
        GOOGLE_CLIENT_SECRET: "client-secret",
      }),
    ).toThrow(
      "Google Calendar webhook notifications require TOKEN_GCAL_NOTIFICATION",
    );
  });

  it("accepts an explicit HTTPS Google webhook URL while BASEURL remains local", () => {
    const env = parseConfigFromEnv({
      ...validEnv,
      BASEURL: "http://localhost:3000/api",
      GCAL_WEBHOOK_BASEURL: "https://example.trycloudflare.com/api",
      GOOGLE_CLIENT_ID: "client-id",
      GOOGLE_CLIENT_SECRET: "client-secret",
      TOKEN_GCAL_NOTIFICATION: "notification-token",
    });

    expect(env.BASEURL).toBe("http://localhost:3000/api");
    expect(env.GCAL_WEBHOOK_BASEURL).toBe(
      "https://example.trycloudflare.com/api",
    );
  });

  it("accepts a non-HTTPS Google webhook URL (webhook HTTPS no longer enforced at field level)", () => {
    const env = parseConfigFromEnv({
      ...validEnv,
      GCAL_WEBHOOK_BASEURL: "http://example.com/api",
    });

    expect(env.GCAL_WEBHOOK_BASEURL).toBe("http://example.com/api");
  });

  it("requires a Google notification token when the explicit webhook URL uses HTTPS", () => {
    expect(() =>
      parseConfigFromEnv({
        ...validEnv,
        BASEURL: "http://localhost:3000/api",
        GCAL_WEBHOOK_BASEURL: "https://example.trycloudflare.com/api",
        GOOGLE_CLIENT_ID: "client-id",
        GOOGLE_CLIENT_SECRET: "client-secret",
      }),
    ).toThrow(
      "Google Calendar webhook notifications require TOKEN_GCAL_NOTIFICATION",
    );
  });

  it("leaves Sync delegation unconfigured by default", () => {
    const env = parseConfigFromEnv(validEnv);

    expect(env.SYNC_SERVICE_URL).toBeUndefined();
    expect(env.SYNC_INTERNAL_AUTH_TOKEN).toBeUndefined();
  });

  it("parses a fully configured Sync delegation", () => {
    const env = parseConfigFromEnv({
      ...validEnv,
      SYNC_SERVICE_URL: "http://localhost:3010",
      SYNC_INTERNAL_AUTH_TOKEN: "sync-internal-secret",
    });

    expect(env.SYNC_SERVICE_URL).toBe("http://localhost:3010");
    expect(env.SYNC_INTERNAL_AUTH_TOKEN).toBe("sync-internal-secret");
  });

  it("rejects a Sync service URL without the internal auth token", () => {
    expect(() =>
      parseConfigFromEnv({
        ...validEnv,
        SYNC_SERVICE_URL: "http://localhost:3010",
      }),
    ).toThrow(
      "Sync delegation requires both SYNC_SERVICE_URL and SYNC_INTERNAL_AUTH_TOKEN",
    );
  });

  it("rejects a Sync auth token without the service URL", () => {
    expect(() =>
      parseConfigFromEnv({
        ...validEnv,
        SYNC_INTERNAL_AUTH_TOKEN: "sync-internal-secret",
      }),
    ).toThrow(
      "Sync delegation requires both SYNC_SERVICE_URL and SYNC_INTERNAL_AUTH_TOKEN",
    );
  });

  it("treats blank Sync env vars as unconfigured rather than failing", () => {
    const env = parseConfigFromEnv({
      ...validEnv,
      SYNC_SERVICE_URL: "",
      SYNC_INTERNAL_AUTH_TOKEN: "",
    });

    expect(env.SYNC_SERVICE_URL).toBeUndefined();
    expect(env.SYNC_INTERNAL_AUTH_TOKEN).toBeUndefined();
  });

  it("does not enable Sync delegation for a standalone Sync deployment without a serviceUrl", () => {
    // A config running the standalone Sync service always sets internalAuthToken
    // (it is required in the sync section) but need not set serviceUrl. That must
    // NOT trip the backend's both-or-neither check and refuse to start.
    const env = parseRawConfig({
      ...baseRawConfig,
      sync: {
        mongoUri: "mongodb://localhost:27017/compass_sync",
        internalAuthToken: "sync-internal-secret",
        callbackBaseUrl: "http://localhost:3010",
      },
    });

    expect(env.SYNC_SERVICE_URL).toBeUndefined();
    expect(env.SYNC_INTERNAL_AUTH_TOKEN).toBeUndefined();
  });

  it("enables delegation when the config sets a Sync serviceUrl", () => {
    const env = parseRawConfig({
      ...baseRawConfig,
      sync: {
        mongoUri: "mongodb://localhost:27017/compass_sync",
        internalAuthToken: "sync-internal-secret",
        callbackBaseUrl: "http://localhost:3010",
        serviceUrl: "http://localhost:3010",
      },
    });

    expect(env.SYNC_SERVICE_URL).toBe("http://localhost:3010");
    expect(env.SYNC_INTERNAL_AUTH_TOKEN).toBe("sync-internal-secret");
  });

  it("defaults connection routing to legacy", () => {
    const env = parseConfigFromEnv(validEnv);

    expect(env.SYNC_CONNECTION_ROUTING).toBe("legacy");
  });

  it("treats a blank connection-routing env var as the legacy default", () => {
    const env = parseConfigFromEnv({
      ...validEnv,
      SYNC_CONNECTION_ROUTING: "",
    });

    expect(env.SYNC_CONNECTION_ROUTING).toBe("legacy");
  });

  it("rejects an unknown connection-routing value", () => {
    expect(() =>
      parseConfigFromEnv({
        ...validEnv,
        SYNC_CONNECTION_ROUTING: "both",
      }),
    ).toThrow();
  });

  it("rejects connection routing = sync without a Sync service URL", () => {
    expect(() =>
      parseConfigFromEnv({
        ...validEnv,
        SYNC_CONNECTION_ROUTING: "sync",
      }),
    ).toThrow("SYNC_CONNECTION_ROUTING=sync requires SYNC_SERVICE_URL");
  });

  it("accepts connection routing = sync when a Sync client is configured", () => {
    const env = parseConfigFromEnv({
      ...validEnv,
      SYNC_CONNECTION_ROUTING: "sync",
      SYNC_SERVICE_URL: "http://localhost:3010",
      SYNC_INTERNAL_AUTH_TOKEN: "sync-internal-secret",
    });

    expect(env.SYNC_CONNECTION_ROUTING).toBe("sync");
  });

  it("rejects config-file connection routing = sync without a serviceUrl", () => {
    // The config-file path couples connectionRouting to serviceUrl the same way
    // the flat env path does; assert the coupling here too, since a required
    // sibling field (internalAuthToken) alone must not satisfy it.
    expect(() =>
      parseRawConfig({
        ...baseRawConfig,
        sync: {
          mongoUri: "mongodb://localhost:27017/compass_sync",
          internalAuthToken: "sync-internal-secret",
          callbackBaseUrl: "http://localhost:3010",
          connectionRouting: "sync",
        },
      }),
    ).toThrow("SYNC_CONNECTION_ROUTING=sync requires SYNC_SERVICE_URL");
  });

  it("enables sync connection routing from the config file with a serviceUrl", () => {
    const env = parseRawConfig({
      ...baseRawConfig,
      sync: {
        mongoUri: "mongodb://localhost:27017/compass_sync",
        internalAuthToken: "sync-internal-secret",
        callbackBaseUrl: "http://localhost:3010",
        serviceUrl: "http://localhost:3010",
        connectionRouting: "sync",
      },
    });

    expect(env.SYNC_CONNECTION_ROUTING).toBe("sync");
  });

  it("defaults event routing to legacy", () => {
    const env = parseConfigFromEnv(validEnv);

    expect(env.SYNC_EVENT_ROUTING).toBe("legacy");
  });

  it("treats a blank event-routing env var as the legacy default", () => {
    const env = parseConfigFromEnv({
      ...validEnv,
      SYNC_EVENT_ROUTING: "",
    });

    expect(env.SYNC_EVENT_ROUTING).toBe("legacy");
  });

  it("rejects event routing = sync without a Sync service URL", () => {
    expect(() =>
      parseConfigFromEnv({
        ...validEnv,
        SYNC_EVENT_ROUTING: "sync",
      }),
    ).toThrow("SYNC_EVENT_ROUTING=sync requires SYNC_SERVICE_URL");
  });

  it("accepts event routing = sync when a Sync client is configured", () => {
    const env = parseConfigFromEnv({
      ...validEnv,
      SYNC_EVENT_ROUTING: "sync",
      SYNC_SERVICE_URL: "http://localhost:3010",
      SYNC_INTERNAL_AUTH_TOKEN: "sync-internal-secret",
    });

    expect(env.SYNC_EVENT_ROUTING).toBe("sync");
  });

  it("routes events and connections independently", () => {
    // The two switches must not be coupled: an operator can delegate events to
    // sync while keeping connections on legacy (or the reverse). Both share the
    // same serviceUrl but resolve independently.
    const env = parseConfigFromEnv({
      ...validEnv,
      SYNC_CONNECTION_ROUTING: "legacy",
      SYNC_EVENT_ROUTING: "sync",
      SYNC_SERVICE_URL: "http://localhost:3010",
      SYNC_INTERNAL_AUTH_TOKEN: "sync-internal-secret",
    });

    expect(env.SYNC_CONNECTION_ROUTING).toBe("legacy");
    expect(env.SYNC_EVENT_ROUTING).toBe("sync");
  });

  it("enables sync event routing from the config file with a serviceUrl", () => {
    const env = parseRawConfig({
      ...baseRawConfig,
      sync: {
        mongoUri: "mongodb://localhost:27017/compass_sync",
        internalAuthToken: "sync-internal-secret",
        callbackBaseUrl: "http://localhost:3010",
        serviceUrl: "http://localhost:3010",
        eventRouting: "sync",
      },
    });

    expect(env.SYNC_EVENT_ROUTING).toBe("sync");
  });

  it("defaults cloud mutation mode to enabled and execution to passive", () => {
    const env = parseConfigFromEnv(validEnv);

    expect(env.SYNC_CLOUD_MUTATION_MODE).toBe("enabled");
    expect(env.SYNC_EXECUTION).toBe("passive");
  });

  it("treats blank mutation-mode and execution env vars as defaults", () => {
    const env = parseConfigFromEnv({
      ...validEnv,
      SYNC_CLOUD_MUTATION_MODE: "",
      SYNC_EXECUTION: "",
    });

    expect(env.SYNC_CLOUD_MUTATION_MODE).toBe("enabled");
    expect(env.SYNC_EXECUTION).toBe("passive");
  });

  it("accepts maintenance + active Sync while routing remains legacy", () => {
    // Cutover window: Sync can be active for import/jobs while cloud mutations
    // are paused and browser routes still point at legacy.
    const env = parseConfigFromEnv({
      ...validEnv,
      SYNC_EXECUTION: "active",
      SYNC_CLOUD_MUTATION_MODE: "maintenance",
      SYNC_CONNECTION_ROUTING: "legacy",
      SYNC_EVENT_ROUTING: "legacy",
      SYNC_SERVICE_URL: "http://localhost:3010",
      SYNC_INTERNAL_AUTH_TOKEN: "sync-internal-secret",
    });

    expect(env.SYNC_EXECUTION).toBe("active");
    expect(env.SYNC_CLOUD_MUTATION_MODE).toBe("maintenance");
  });

  it("accepts active + enabled only when both routings are sync", () => {
    const env = parseConfigFromEnv({
      ...validEnv,
      SYNC_EXECUTION: "active",
      SYNC_CLOUD_MUTATION_MODE: "enabled",
      SYNC_CONNECTION_ROUTING: "sync",
      SYNC_EVENT_ROUTING: "sync",
      SYNC_SERVICE_URL: "http://localhost:3010",
      SYNC_INTERNAL_AUTH_TOKEN: "sync-internal-secret",
    });

    expect(env.SYNC_EXECUTION).toBe("active");
    expect(env.SYNC_CLOUD_MUTATION_MODE).toBe("enabled");
  });

  it.each([
    ["connection routing legacy", "legacy", "sync"],
    ["event routing legacy", "sync", "legacy"],
    ["both routings legacy", "legacy", "legacy"],
  ] as const)("refuses dual-writer when active + enabled and %s", (_label, connectionRouting, eventRouting) => {
    expect(() =>
      parseConfigFromEnv({
        ...validEnv,
        SYNC_EXECUTION: "active",
        SYNC_CLOUD_MUTATION_MODE: "enabled",
        SYNC_CONNECTION_ROUTING: connectionRouting,
        SYNC_EVENT_ROUTING: eventRouting,
        SYNC_SERVICE_URL: "http://localhost:3010",
        SYNC_INTERNAL_AUTH_TOKEN: "sync-internal-secret",
      }),
    ).toThrow("refuse dual-writer");
  });

  it("refuses dual-writer from the config file path as well", () => {
    expect(() =>
      parseRawConfig({
        ...baseRawConfig,
        sync: {
          mongoUri: "mongodb://localhost:27017/compass_sync",
          internalAuthToken: "sync-internal-secret",
          callbackBaseUrl: "http://localhost:3010",
          serviceUrl: "http://localhost:3010",
          execution: "active",
          cloudMutationMode: "enabled",
          connectionRouting: "legacy",
          eventRouting: "sync",
        },
      }),
    ).toThrow("refuse dual-writer");
  });
});
