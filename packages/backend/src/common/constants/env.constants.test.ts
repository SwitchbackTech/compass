import {
  isGoogleConfigured,
  parseBackendEnv,
} from "@backend/common/constants/env.constants";

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

describe("env.constants", () => {
  it("parses password-only backend env without Google configuration", () => {
    const env = parseBackendEnv(validEnv);

    expect(env.GOOGLE_CLIENT_ID).toBeUndefined();
    expect(env.GOOGLE_CLIENT_SECRET).toBeUndefined();
    expect(env.GCAL_WEBHOOK_BASEURL).toBeUndefined();
    expect(env.TOKEN_GCAL_NOTIFICATION).toBe("");
    expect(isGoogleConfigured(env)).toBe(false);
  });

  it("rejects partially configured Google credentials", () => {
    expect(() =>
      parseBackendEnv({
        ...validEnv,
        GOOGLE_CLIENT_ID: "client-id",
      }),
    ).toThrow("Google configuration requires both client ID and secret");

    expect(() =>
      parseBackendEnv({
        ...validEnv,
        GOOGLE_CLIENT_SECRET: "client-secret",
      }),
    ).toThrow("Google configuration requires both client ID and secret");
  });

  it("reports Google as configured only when both credentials are present", () => {
    const env = parseBackendEnv({
      ...validEnv,
      BASEURL: "http://localhost:3000/api",
      GOOGLE_CLIENT_ID: "client-id",
      GOOGLE_CLIENT_SECRET: "client-secret",
    });

    expect(isGoogleConfigured(env)).toBe(true);
  });

  it("requires a Google notification token for HTTPS Google watch callbacks", () => {
    expect(() =>
      parseBackendEnv({
        ...validEnv,
        BASEURL: "https://api.example.com/api",
        GOOGLE_CLIENT_ID: "client-id",
        GOOGLE_CLIENT_SECRET: "client-secret",
      }),
    ).toThrow(
      "Google Calendar webhook notifications require TOKEN_GCAL_NOTIFICATION",
    );
  });

  it("accepts an HTTPS Google webhook base URL while BASEURL remains local", () => {
    const env = parseBackendEnv({
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

  it("rejects a non-HTTPS Google webhook base URL", () => {
    expect(() =>
      parseBackendEnv({
        ...validEnv,
        GCAL_WEBHOOK_BASEURL: "http://localhost:3000/api",
      }),
    ).toThrow("GCAL_WEBHOOK_BASEURL must use HTTPS");
  });

  it("requires a Google notification token when the Google webhook URL uses HTTPS", () => {
    expect(() =>
      parseBackendEnv({
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
