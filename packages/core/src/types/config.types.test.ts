import { AppConfigSchema } from "@core/types/config.types";
import { describe, expect, it } from "bun:test";

describe("AppConfigSchema", () => {
  it("defaults billing.publishableKey to null when the field is omitted", () => {
    const parsed = AppConfigSchema.parse({
      google: { isConfigured: false },
      billing: {
        isConfigured: false,
        enforcement: false,
        trialLengthDays: 7,
      },
    });

    expect(parsed.billing.publishableKey).toBeNull();
  });
});
