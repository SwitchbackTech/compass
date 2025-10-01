import glob from "fast-glob";
import { readFile } from "node:fs/promises";
import { parse, resolve, sep } from "node:path";
import type { MigrationParams, RunnableMigration } from "umzug";
import { MongoDBStorage, Umzug, UmzugCLI } from "umzug";
import { MigrationContext, MigratorType } from "@scripts/common/cli.types";
import { Logger } from "@core/logger/winston.logger";
import mongoService from "@backend/common/services/mongo.service";

const logger = Logger("scripts.commands.migrations");

async function migrations(
  context: MigrationContext,
): Promise<Array<RunnableMigration<MigrationContext>>> {
  const { unsafe } = context;
  const folder = `${context.migratorType.toLowerCase()}s`;
  const migrationsRoot = resolve(__dirname, "..", folder);
  const unsafeText = unsafe ? "unsafe " : "";
  const fileGlob = `${migrationsRoot}/**/*.{ts,js}`;
  const files = glob.sync(fileGlob, { absolute: true });

  const migrations = await Promise.all(
    files.map(async (path) => {
      const { default: Migration } = (await import(path ?? "")) as {
        default: { new (): RunnableMigration<MigrationContext> };
      };

      const migration = new Migration();
      const name = parse(path).name;

      return {
        name,
        path,
        up: async (
          params: MigrationParams<MigrationContext>,
        ): Promise<void> => {
          const { logger } = params.context;

          logger.debug(`Running ${unsafeText}up migration(${name})`);
          logger.debug(path);

          await migration.up(params);

          logger.debug(`Up migration(${name}) run successful`);
        },
        down: async (
          params: MigrationParams<MigrationContext>,
        ): Promise<void> => {
          if (!migration.down) return;

          const { logger } = params.context;

          logger.debug(`Running ${unsafeText}down migration(${name})`);
          logger.debug(path);

          await migration.down(params);

          logger.debug(`Down migration(${name}) ran successful`);
        },
      };
    }),
  );

  return migrations.sort((prev, next) =>
    prev.path.split("/").pop()!.localeCompare(next.path.split("/").pop()!),
  );
}

async function template({
  migratorType,
  filePath,
  migrationsRoot,
}: {
  migratorType: MigratorType;
  filePath: string;
  migrationsRoot: string;
}): Promise<[string, string][]> {
  const { base, name } = parse(filePath);
  const path = resolve(migrationsRoot, base);

  return readFile(
    resolve(migrationsRoot, "..", "common", "migrator-template.ts"),
  ).then((contents): [string, string][] => [
    [
      path,
      contents
        .toString()
        .replace("class Template", `class ${migratorType}`)
        .replace("{{name}}", name.split(".").pop()!)
        .replace("{{path}}", path.replace(`${migrationsRoot}${sep}`, "")),
    ],
  ]);
}

async function createMigrationCli(
  migratorType: MigratorType,
): Promise<UmzugCLI> {
  const folder = `${migratorType.toLowerCase()}s`;
  const migrationsRoot = resolve(__dirname, "..", folder);
  const collection = mongoService.db.collection(folder);
  const storage = new MongoDBStorage({ collection });

  const umzug = new Umzug<MigrationContext>({
    storage,
    logger: undefined,
    migrations,
    create: {
      folder: migrationsRoot,
      template: (filePath) =>
        template({ migratorType, filePath, migrationsRoot }),
    },
    context: async (): Promise<MigrationContext> => {
      const unsafe = cli.getFlagParameter("--unsafe").value;

      return { logger, migratorType, unsafe };
    },
  });

  const cli = new UmzugCLI(umzug as Umzug<object>, {
    toolDescription: "Compass migrator",
    toolFileName: "cli.ts",
  });

  cli.defineFlagParameter({
    parameterLongName: "--unsafe",
    parameterShortName: "-u",
    description: "Run unsafe migration code within up and down methods",
    environmentVariable: "MIGRATION_UNSAFE",
  });

  return cli;
}

export const runMigrator = async (
  migratorType: MigratorType,
  useDynamicDb = false,
): Promise<void> => {
  try {
    await mongoService.start(useDynamicDb);

    const cli = await createMigrationCli(migratorType);

    await cli.executeAsync(process.argv.slice(3));

    await mongoService.stop();

    process.exit(0);
  } catch (error) {
    logger.error(error);

    process.exit(1);
  }
};
