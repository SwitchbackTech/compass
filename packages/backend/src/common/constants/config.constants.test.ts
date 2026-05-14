import {
  SELF_HOST_GOOGLE_CLIENT_ID_PLACEHOLDER,
  SELF_HOST_GOOGLE_CLIENT_SECRET_PLACEHOLDER,
} from "@core/constants/core.constants";
import { parseConfigFromEnv } from "@backend/common/constants/config.constants";
import { isGoogleConfigured } from "@backend/common/constants/config.util";

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

  it("treats self-host Google placeholders as not configured", () => {
    const env = parseConfigFromEnv({
      ...validEnv,
      GOOGLE_CLIENT_ID: SELF_HOST_GOOGLE_CLIENT_ID_PLACEHOLDER,
      GOOGLE_CLIENT_SECRET: SELF_HOST_GOOGLE_CLIENT_SECRET_PLACEHOLDER,
    });

    expect(isGoogleConfigured(env)).toBe(false);
  });

  it("rejects mixed real and placeholder Google credentials", () => {
    expect(() =>
      parseConfigFromEnv({
        ...validEnv,
        GOOGLE_CLIENT_ID: "client-id",
        GOOGLE_CLIENT_SECRET: SELF_HOST_GOOGLE_CLIENT_SECRET_PLACEHOLDER,
      }),
    ).toThrow("Google configuration requires both client ID and secret");

    expect(() =>
      parseConfigFromEnv({
        ...validEnv,
        GOOGLE_CLIENT_ID: SELF_HOST_GOOGLE_CLIENT_ID_PLACEHOLDER,
        GOOGLE_CLIENT_SECRET: "client-secret",
      }),
    ).toThrow("Google configuration requires both client ID and secret");
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
});
