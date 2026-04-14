import { type MigrationContext } from "@scripts/common/cli.types";
import { type MigrationParams, type RunnableMigration } from "umzug";

export default class Template implements RunnableMigration<MigrationContext> {
  readonly name: string = "{{name}}";
  readonly path: string = "{{path}}";

  async up(params: MigrationParams<MigrationContext>): Promise<void> {
    const { context } = params;
    const { logger } = context;

    logger.debug(`running up migrations(${this.name}).`);

    return Promise.resolve();
  }

  async down(params: MigrationParams<MigrationContext>): Promise<void> {
    const { context, name, path } = params;
    const { unsafe } = context;
    const { logger } = context;
    const unsafeText = unsafe ? " unsafe " : "";

    logger.debug(`running${unsafeText}down migration`, { name, path });

    return Promise.resolve();
  }
}
