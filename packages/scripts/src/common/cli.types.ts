import { type Logger } from "@core/logger/winston.logger";

export type Environment_Cli = "local" | "staging" | "production";

export enum MigratorType {
  MIGRATION = "Migration",
}

export interface MigrationContext {
  logger: ReturnType<typeof Logger>;
  migratorType: MigratorType;
  unsafe: boolean;
  dryRun: boolean;
}
