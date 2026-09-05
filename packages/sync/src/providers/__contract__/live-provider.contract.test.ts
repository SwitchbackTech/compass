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
  hasMicrosoftLiveCredentials,
  microsoftLiveFactory,
} from "@sync/providers/__contract__/microsoft-contract.factory";
import { describe, it } from "bun:test";

const liveKind = process.env["LIVE_PROVIDER"];
const calendarId = process.env["LIVE_CALENDAR_ID"];

if (!liveKind) {
  describe.skip("live provider contract", () => {
    it("set LIVE_PROVIDER=<kind> to run against the real API", () => {});
  });
} else if (liveKind === "google" && hasGoogleLiveCredentials() && calendarId) {
  describeProviderContract("google", googleLiveFactory, {
    calendarId,
    refreshToken: process.env["SMOKE_GOOGLE_REFRESH_TOKEN"],
    skipAuthExchange: true,
    skipAuthRevoked: true,
    skipWatch: true,
  });
} else if (
  liveKind === "microsoft" &&
  hasMicrosoftLiveCredentials() &&
  calendarId
) {
  describeProviderContract("microsoft", microsoftLiveFactory, {
    calendarId,
    refreshToken: process.env["SMOKE_MICROSOFT_REFRESH_TOKEN"],
    skipAuthExchange: true,
    skipAuthRevoked: true,
    skipWatch: true,
    skipNotifications: true,
  });
} else if (liveKind === "apple" && hasAppleLiveCredentials() && calendarId) {
  describeProviderContract("apple", appleLiveFactory, {
    calendarId,
    accessToken: smokeAppleAppPassword(),
    skipAuthExchange: true,
    skipAuthRevoked: true,
    skipWatch: true,
    skipNotifications: true,
    skipNormalizerRoundTrip: true,
  });
} else {
  describe.skip(`live provider contract (${liveKind})`, () => {
    it("skipped: secrets absent, LIVE_CALENDAR_ID unset, or live factory not wired", () => {});
  });
}
