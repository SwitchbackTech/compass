import { Logger } from "@core/logger/winston.logger";
import { mockEnv } from "@backend/__tests__/helpers/mock.setup";
import { warnIfWebhookNotPublicHttps } from "@backend/sync/services/watch/google-watch-config";

describe("warnIfWebhookNotPublicHttps (packet 09 ops: self-host webhook check)", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("warns once when Google is configured but the webhook base URL is not public HTTPS", () => {
    mockEnv({
      GOOGLE_CLIENT_ID: "a-real-client-id",
      GOOGLE_CLIENT_SECRET: "a-real-client-secret",
      GCAL_WEBHOOK_BASEURL: "http://localhost:3000",
    });
    const log = Logger("test:google-watch-config");
    const warnSpy = jest.spyOn(log, "warn");

    warnIfWebhookNotPublicHttps(log);

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("docs/self-hosting/google-calendar.md"),
    );
  });

  it("does not warn when the webhook base URL is already public HTTPS", () => {
    mockEnv({
      GOOGLE_CLIENT_ID: "a-real-client-id",
      GOOGLE_CLIENT_SECRET: "a-real-client-secret",
      GCAL_WEBHOOK_BASEURL: "https://cal.example.com",
    });
    const log = Logger("test:google-watch-config");
    const warnSpy = jest.spyOn(log, "warn");

    warnIfWebhookNotPublicHttps(log);

    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("does not warn when Google is not configured at all (password-only self-host)", () => {
    mockEnv({
      GOOGLE_CLIENT_ID: undefined,
      GOOGLE_CLIENT_SECRET: undefined,
      GCAL_WEBHOOK_BASEURL: "http://localhost:3000",
    });
    const log = Logger("test:google-watch-config");
    const warnSpy = jest.spyOn(log, "warn");

    warnIfWebhookNotPublicHttps(log);

    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("does not warn when only one of client id/secret is set (invalid config zod already rejects at boot)", () => {
    mockEnv({
      GOOGLE_CLIENT_ID: "a-real-client-id",
      GOOGLE_CLIENT_SECRET: undefined,
      GCAL_WEBHOOK_BASEURL: "http://localhost:3000",
    });
    const log = Logger("test:google-watch-config");
    const warnSpy = jest.spyOn(log, "warn");

    warnIfWebhookNotPublicHttps(log);

    expect(warnSpy).not.toHaveBeenCalled();
  });
});
