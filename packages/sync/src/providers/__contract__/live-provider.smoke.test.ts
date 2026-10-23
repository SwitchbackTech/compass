import {
  hasAppleLiveCredentials,
  smokeAppleAppPassword,
  smokeAppleEmail,
} from "@sync/providers/__contract__/apple-contract.factory";
import { hasGoogleLiveCredentials } from "@sync/providers/__contract__/google-contract.factory";
import {
  runAppleLiveSmoke,
  runGoogleLiveSmoke,
  runMicrosoftLiveSmoke,
} from "@sync/providers/__contract__/live-provider-smoke";
import { hasMicrosoftLiveCredentials } from "@sync/providers/__contract__/microsoft-contract.factory";
import { describe, expect, it } from "bun:test";

const liveKind = process.env["LIVE_PROVIDER"];

const failLiveSetup = (kind: string, message: string): void => {
  describe(`live provider smoke (${kind})`, () => {
    it(message, () => {
      throw new Error(message);
    });
  });
};

if (!liveKind) {
  describe.skip("live provider smoke", () => {
    it("set LIVE_PROVIDER=<kind> to mutate compass-smoke on a real account", () => {});
  });
} else if (liveKind === "google") {
  if (!process.env["SMOKE_GOOGLE_REFRESH_TOKEN"]) {
    failLiveSetup(
      "google",
      "SMOKE_GOOGLE_REFRESH_TOKEN is missing. Add it to the provider-smoke GitHub Environment secrets.",
    );
  } else if (!hasGoogleLiveCredentials()) {
    failLiveSetup(
      "google",
      "Google OAuth client id/secret missing (GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in provider-smoke).",
    );
  } else {
    describe("google live provider smoke", () => {
      it("creates, reads, updates, exceptions, and deletes only on compass-smoke", async () => {
        const refreshToken = process.env["SMOKE_GOOGLE_REFRESH_TOKEN"];
        if (!refreshToken)
          throw new Error("SMOKE_GOOGLE_REFRESH_TOKEN missing");
        await runGoogleLiveSmoke({
          runId: process.env["GITHUB_RUN_ID"] ?? `local-${Date.now()}`,
          refreshToken,
        });
        expect(process.env["LIVE_CALENDAR_ID"]).toBeTruthy();
      });
    });
  }
} else if (liveKind === "microsoft") {
  if (!process.env["SMOKE_MICROSOFT_REFRESH_TOKEN"]) {
    failLiveSetup(
      "microsoft",
      "SMOKE_MICROSOFT_REFRESH_TOKEN is missing. Add it to the provider-smoke GitHub Environment secrets.",
    );
  } else if (!hasMicrosoftLiveCredentials()) {
    failLiveSetup(
      "microsoft",
      "Microsoft OAuth client id/secret missing (MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET in provider-smoke).",
    );
  } else {
    describe("microsoft live provider smoke", () => {
      it("creates, reads, updates, exceptions, and deletes only on compass-smoke", async () => {
        const refreshToken = process.env["SMOKE_MICROSOFT_REFRESH_TOKEN"];
        if (!refreshToken)
          throw new Error("SMOKE_MICROSOFT_REFRESH_TOKEN missing");
        await runMicrosoftLiveSmoke({
          runId: process.env["GITHUB_RUN_ID"] ?? `local-${Date.now()}`,
          refreshToken,
        });
        expect(process.env["LIVE_CALENDAR_ID"]).toBeTruthy();
      });
    });
  }
} else if (liveKind === "apple") {
  if (!hasAppleLiveCredentials()) {
    failLiveSetup(
      "apple",
      "SMOKE_APPLE_EMAIL or SMOKE_APPLE_APP_PASSWORD is missing. Add both to the provider-smoke GitHub Environment secrets.",
    );
  } else {
    describe("apple live provider smoke", () => {
      it("creates, reads, updates, exceptions, and deletes only on compass-smoke", async () => {
        const email = smokeAppleEmail();
        const appPassword = smokeAppleAppPassword();
        if (!email || !appPassword) {
          throw new Error(
            "SMOKE_APPLE_EMAIL or SMOKE_APPLE_APP_PASSWORD missing",
          );
        }
        await runAppleLiveSmoke({
          runId: process.env["GITHUB_RUN_ID"] ?? `local-${Date.now()}`,
          email,
          appPassword,
        });
        expect(process.env["LIVE_CALENDAR_ID"]).toBeTruthy();
      });
    });
  }
} else {
  failLiveSetup(
    liveKind,
    `Unknown LIVE_PROVIDER=${liveKind}. Expected google, microsoft, or apple.`,
  );
}
