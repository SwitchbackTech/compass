import { z } from "zod";

export const AppConfigSchema = z.object({
  google: z.object({
    isConfigured: z.boolean(),
    /**
     * True when this deployment delegates Google connections to the sync
     * service (the redirect-based begin flow) instead of the legacy in-backend
     * code-exchange. Deployment-level, not per-user: it mirrors the global
     * SYNC_CONNECTION_ROUTING switch so the browser can pick the connect UX
     * before authenticating. Absent/false everywhere delegation is off.
     */
    connectDelegatedToSync: z.boolean().default(false),
  }),
});

export type AppConfig = z.infer<typeof AppConfigSchema>;
