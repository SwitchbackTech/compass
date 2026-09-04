import { hasGoogleLiveCredentials } from "@sync/providers/__contract__/google-contract.factory";
import { runGoogleLiveSmoke } from "@sync/providers/__contract__/live-provider-smoke";
import { describe, expect, it } from "bun:test";

const liveKind = process.env["LIVE_PROVIDER"];

if (!liveKind) {
  describe.skip("live provider smoke", () => {
    it("set LIVE_PROVIDER=<kind> to mutate compass-smoke on a real account", () => {});
  });
} else if (liveKind === "google" && hasGoogleLiveCredentials()) {
  describe("google live provider smoke", () => {
    it("creates, reads, updates, exceptions, and deletes only on compass-smoke", async () => {
      const refreshToken = process.env["SMOKE_GOOGLE_REFRESH_TOKEN"];
      if (!refreshToken) throw new Error("SMOKE_GOOGLE_REFRESH_TOKEN missing");
      await runGoogleLiveSmoke({
        runId: process.env["GITHUB_RUN_ID"] ?? `local-${Date.now()}`,
        refreshToken,
      });
      expect(process.env["LIVE_CALENDAR_ID"]).toBeTruthy();
    });
  });
} else {
  describe.skip(`live provider smoke (${liveKind})`, () => {
    it("skipped: secrets absent or live factory not wired for this provider", () => {});
  });
}
