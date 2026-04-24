import { z } from "zod";

export const AppConfigSchema = z.object({
  google: z.object({
    isConfigured: z.boolean(),
  }),
});

export type AppConfig = z.infer<typeof AppConfigSchema>;
