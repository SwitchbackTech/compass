import { z } from "zod";

export const AppConfigSchema = z.object({
  google: z.object({
    isConfigured: z.boolean(),
    /**
     * True when this deployment delegates Google connections to the sync
     * service (the redirect-based begin flow) instead of the legacy in-backend
     * code-exchange. Deployment-level, not per-user: it mirrors whether Sync
     * is configured, so the browser can pick the connect UX before
     * authenticating. Absent/false only for a deployment that hasn't
     * provisioned Sync yet.
     */
    connectDelegatedToSync: z.boolean().default(false),
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
