import { describeProviderContract } from "@sync/providers/__contract__/adapter-contract";
import {
  googleLiveFactory,
  hasGoogleLiveCredentials,
} from "@sync/providers/__contract__/google-contract.factory";
import { describe, it } from "bun:test";

const liveKind = process.env["LIVE_PROVIDER"];

if (!liveKind) {
  describe.skip("live provider contract", () => {
    it("set LIVE_PROVIDER=<kind> to run against the real API", () => {});
  });
} else if (liveKind === "google" && hasGoogleLiveCredentials()) {
  describeProviderContract("google", googleLiveFactory, {
    accessToken: "unused-until-refresh",
    calendarId: process.env["LIVE_CALENDAR_ID"] ?? "primary",
    refreshToken: process.env["SMOKE_GOOGLE_REFRESH_TOKEN"],
    skipAuthExchange: true,
    skipAuthRevoked: true,
    skipWatch: true,
  });
} else {
  describe.skip(`live provider contract (${liveKind})`, () => {
    it("skipped: secrets absent or live factory not wired for this provider", () => {});
  });
}
