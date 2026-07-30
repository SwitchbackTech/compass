import { z } from "zod";

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
});

export type AppConfig = z.infer<typeof AppConfigSchema>;
