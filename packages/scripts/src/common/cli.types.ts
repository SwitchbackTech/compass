import { z } from "zod";
import type { Logger } from "@core/logger/winston.logger";

export const Schema_Options_Cli_Root = z.object({});

export const Schema_Options_Cli_Build = z.object({
  clientId: z.string().optional(),
  environment: z.enum(["local", "staging", "production"]).optional(),
  packages: z.array(z.string()).optional(),
});

export const Schema_Options_Cli_Delete = z.object({
  user: z.string().optional(),
  force: z.boolean().optional(),
});

export type Options_Cli_Delete = z.infer<typeof Schema_Options_Cli_Delete>;
export type Options_Cli_Build = z.infer<typeof Schema_Options_Cli_Build>;
export type Options_Cli_Root = z.infer<typeof Schema_Options_Cli_Root>;
export type Options_Cli = Options_Cli_Root &
  Options_Cli_Build &
  Options_Cli_Delete;

export type Environment_Cli = "local" | "staging" | "production";

export enum MigratorType {
  SEEDER = "Seeder",
  MIGRATION = "Migration",
}

export interface MigrationContext {
  logger: ReturnType<typeof Logger>;
  migratorType: MigratorType;
  unsafe: boolean;
}
