import { type CompassConfig } from "@core/config/compass.config";
import {
  parseConfigFromEnv,
  parseRawConfig,
} from "@backend/common/constants/config.constants";
import { isGoogleConfigured } from "@backend/common/constants/config.util";
import { describe, expect, it } from "bun:test";

// A minimal valid compass config file, mirroring the required fields
// parseRawConfig reads. Sync is required (every deployment delegates to it),
// so the base fixture always includes it.
const baseRawConfig: CompassConfig = {
  web: { url: "http://localhost:9080" },
  backend: {
    apiUrl: "http://localhost:3000/api",
    compassToken: "compass-token",
  },
  runtime: { nodeEnv: "development", timezone: "Etc/UTC" },
  mongo: { uri: "mongodb://localhost:27017/compass" },
  supertokens: { uri: "http://localhost:3567", key: "supertokens-key" },
  sync: {
    mongoUri: "mongodb://localhost:27017/compass_sync",
    internalAuthToken: "sync-internal-secret",
    callbackBaseUrl: "http://localhost:3010",
    serviceUrl: "http://localhost:3010",
  },
};

const validEnv = {
  BASEURL: "http://localhost:3000/api",
  CORS: "http://localhost:9080",
  FRONTEND_URL: "http://localhost:9080",
  MONGO_URI: "mongodb://localhost:27017/compass",
  NODE_ENV: "development",
  PORT: "3000",
  SUPERTOKENS_KEY: "supertokens-key",
  SUPERTOKENS_URI: "http://localhost:3567",
  TOKEN_COMPASS_SYNC: "sync-token",
  TZ: "Etc/UTC",
  SYNC_SERVICE_URL: "http://localhost:3010",
  SYNC_INTERNAL_AUTH_TOKEN: "sync-internal-secret",
};

describe("config.constants", () => {
  it("parses backend env without Google configuration", () => {
    const env = parseConfigFromEnv(validEnv);

    expect(env.GOOGLE_CLIENT_ID).toBeUndefined();
    expect(env.GOOGLE_CLIENT_SECRET).toBeUndefined();
    expect(isGoogleConfigured(env)).toBe(false);
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

  it("parses a fully configured Sync client", () => {
    const env = parseConfigFromEnv(validEnv);

    expect(env.SYNC_SERVICE_URL).toBe("http://localhost:3010");
    expect(env.SYNC_INTERNAL_AUTH_TOKEN).toBe("sync-internal-secret");
  });

  it("rejects env missing SYNC_SERVICE_URL", () => {
    expect(() =>
      parseConfigFromEnv({ ...validEnv, SYNC_SERVICE_URL: undefined }),
    ).toThrow();
  });

  it("rejects env missing SYNC_INTERNAL_AUTH_TOKEN", () => {
    expect(() =>
      parseConfigFromEnv({ ...validEnv, SYNC_INTERNAL_AUTH_TOKEN: undefined }),
    ).toThrow();
  });

  it("rejects blank Sync env vars rather than silently defaulting", () => {
    expect(() =>
      parseConfigFromEnv({ ...validEnv, SYNC_SERVICE_URL: "" }),
    ).toThrow();
  });

  it("rejects a raw config missing sync.serviceUrl", () => {
    // Every deployment (self-hosted or cloud) sets serviceUrl now - there is
    // no more "runs Sync without pointing the backend at it" configuration.
    expect(() =>
      parseRawConfig({
        ...baseRawConfig,
        sync: { ...baseRawConfig.sync, serviceUrl: undefined },
      }),
    ).toThrow();
  });

  it("reads Sync fields from a raw config file", () => {
    const env = parseRawConfig(baseRawConfig);

    expect(env.SYNC_SERVICE_URL).toBe("http://localhost:3010");
    expect(env.SYNC_INTERNAL_AUTH_TOKEN).toBe("sync-internal-secret");
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

  it("accepts active + enabled with a Sync client configured", () => {
    const env = parseConfigFromEnv({
      ...validEnv,
      SYNC_EXECUTION: "active",
      SYNC_CLOUD_MUTATION_MODE: "enabled",
      SYNC_SERVICE_URL: "http://localhost:3010",
      SYNC_INTERNAL_AUTH_TOKEN: "sync-internal-secret",
    });

    expect(env.SYNC_EXECUTION).toBe("active");
    expect(env.SYNC_CLOUD_MUTATION_MODE).toBe("enabled");
  });
});
