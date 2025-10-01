import type { MigrationParams, RunnableMigration } from "umzug";
import { MigrationContext } from "@scripts/common/cli.types";

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
