import { describeProviderContract } from "@sync/providers/__contract__/adapter-contract";
import {
  appleLiveFactory,
  hasAppleLiveCredentials,
  smokeAppleAppPassword,
} from "@sync/providers/__contract__/apple-contract.factory";
import {
  googleLiveFactory,
  hasGoogleLiveCredentials,
} from "@sync/providers/__contract__/google-contract.factory";
import {
  ensureAppleLiveSession,
  ensureGoogleLiveSession,
  ensureMicrosoftLiveSession,
} from "@sync/providers/__contract__/live-provider-smoke";
import {
  hasMicrosoftLiveCredentials,
  microsoftLiveFactory,
} from "@sync/providers/__contract__/microsoft-contract.factory";
import { describe, it } from "bun:test";

const liveKind = process.env["LIVE_PROVIDER"];

const failLiveSetup = (kind: string, message: string): void => {
  describe(`live provider contract (${kind})`, () => {
    it(message, () => {
      throw new Error(message);
    });
  });
};

if (!liveKind) {
  describe.skip("live provider contract", () => {
    it("set LIVE_PROVIDER=<kind> to run against the real API", () => {});
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
    const refreshToken = process.env["SMOKE_GOOGLE_REFRESH_TOKEN"];
    const { calendarId } = await ensureGoogleLiveSession(refreshToken);
    describeProviderContract("google", googleLiveFactory, {
      calendarId,
      refreshToken,
      skipAuthExchange: true,
      skipAuthRevoked: true,
      skipWatch: true,
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
    const refreshToken = process.env["SMOKE_MICROSOFT_REFRESH_TOKEN"];
    const { calendarId } = await ensureMicrosoftLiveSession(refreshToken);
    describeProviderContract("microsoft", microsoftLiveFactory, {
      calendarId,
      refreshToken,
      skipAuthExchange: true,
      skipAuthRevoked: true,
      skipWatch: true,
      skipNotifications: true,
    });
  }
} else if (liveKind === "apple") {
  if (!hasAppleLiveCredentials()) {
    failLiveSetup(
      "apple",
      "SMOKE_APPLE_EMAIL or SMOKE_APPLE_APP_PASSWORD is missing. Add both to the provider-smoke GitHub Environment secrets.",
    );
  } else {
    const appPassword = smokeAppleAppPassword();
    if (!appPassword) {
      failLiveSetup(
        "apple",
        "SMOKE_APPLE_APP_PASSWORD is missing. Add it to the provider-smoke GitHub Environment secrets.",
      );
    } else {
      const { calendarId } = await ensureAppleLiveSession(appPassword);
      describeProviderContract("apple", appleLiveFactory, {
        calendarId,
        accessToken: appPassword,
        skipAuthExchange: true,
        skipAuthRevoked: true,
        skipWatch: true,
        skipNotifications: true,
        skipNormalizerRoundTrip: true,
      });
    }
  }
} else {
  failLiveSetup(
    liveKind,
    `Unknown LIVE_PROVIDER=${liveKind}. Expected google, microsoft, or apple.`,
  );
}
