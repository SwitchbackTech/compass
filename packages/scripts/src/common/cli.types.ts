import { z } from "zod";

export type Environment_Cli = "staging" | "production";

export const Schema_Options_Cli = z.object({
  clientId: z.string().optional(),
  environment: z.enum(["staging", "production"]).optional(),
  force: z.boolean().optional(),
  packages: z.array(z.string()).optional(),
  user: z.string().optional(),
});

export type Options_Cli = z.infer<typeof Schema_Options_Cli>;
