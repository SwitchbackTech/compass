import { describeProviderContract } from "@sync/providers/__contract__/adapter-contract";
import {
  googleLiveFactory,
  hasGoogleLiveCredentials,
} from "@sync/providers/__contract__/google-contract.factory";
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
} else {
  describe.skip(`live provider contract (${liveKind})`, () => {
    it("skipped: secrets absent, LIVE_CALENDAR_ID unset, or live factory not wired", () => {});
  });
}
