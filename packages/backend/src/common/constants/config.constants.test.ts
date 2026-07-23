import { parseConfigFromEnv } from "@backend/common/constants/config.constants";
import { isGoogleConfigured } from "@backend/common/constants/config.util";
import { describe, expect, it } from "bun:test";

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
});
