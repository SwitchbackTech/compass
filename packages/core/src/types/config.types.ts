import { z } from "zod";
import { BILLING_PLAN } from "@core/constants/billing.constants";

export const AppConfigSchema = z.object({
  google: z.object({
    isConfigured: z.boolean(),
  }),
  /**
   * Operator-visible Sync cutover posture (S50). Global deployment knobs —
   * never per-user. Defaults match safe pre-cutover values when omitted.
   */
  sync: z
    .object({
      cloudMutationMode: z.enum(["enabled", "maintenance"]).default("enabled"),
      execution: z.enum(["passive", "active"]).default("passive"),
    })
    .default({
      cloudMutationMode: "enabled",
      execution: "passive",
    }),
  /**
   * Hosted billing. `isConfigured: false` is the self-host escape hatch:
   * the web must not render a paid gate, and the backend must not enforce
   * read-only. Defaults keep old `/api/config` payloads parseable.
   */
  billing: z
    .object({
      isConfigured: z.boolean(),
      priceDisplay: z.string(),
      trialLengthDays: z.number(),
    })
    .default({
      isConfigured: false,
      priceDisplay: BILLING_PLAN.PRICE_DISPLAY,
      trialLengthDays: BILLING_PLAN.TRIAL_LENGTH_DAYS,
    }),
});

export type AppConfig = z.infer<typeof AppConfigSchema>;
