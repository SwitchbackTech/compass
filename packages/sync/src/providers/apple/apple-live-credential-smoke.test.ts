import { AppleAuthAdapter } from "@sync/providers/apple/apple-auth.adapter";

const email = process.env.SMOKE_APPLE_EMAIL?.trim();
const appPassword = process.env.SMOKE_APPLE_APP_PASSWORD?.trim();
const liveConfigured = Boolean(email && appPassword);

describe.skipIf(!liveConfigured)(
  "Apple CalDAV live credential smoke (opt-in via provider-smoke secrets)",
  () => {
    it("validates the configured iCloud app-specific password", async () => {
      const adapter = new AppleAuthAdapter();
      await adapter.validateCredential({
        username: email!,
        secret: appPassword!,
      });
    });
  },
);
