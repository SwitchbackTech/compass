import { Command } from "commander";

import { ALL_PACKAGES } from "./common/cli.constants";
import {
  Options_Cli,
  Options_Cli_Build,
  Options_Cli_Delete,
  Schema_Options_Cli_Build,
  Schema_Options_Cli_Delete,
  Schema_Options_Cli_Root,
} from "./common/cli.types";
import { getPckgsTo, log } from "./common/cli.utils";

export class CliValidator {
  private program: Command;

  constructor(program: Command) {
    this.program = program;
  }

  public exitHelpfully(cmd: "root" | "build" | "delete", msg?: string) {
    msg && log.error(msg);

    if (cmd === "root") {
      console.log(this.program.helpInformation());
    } else {
      const command = this.program.commands.find(
        (c) => c.name() === cmd,
      ) as Command;
      console.log(command.helpInformation());
    }

    process.exit(1);
  }

  public getCliOptions(): Options_Cli {
    const options = this._mergeOptions();
    const validOptions = this._validateOptions(options);

    return validOptions;
  }

  public async validateBuild(options: Options_Cli) {
    if (!options.packages) {
      options.packages = await getPckgsTo("build");
    }

    const unsupportedPackages = options.packages.filter(
      (pkg) => !ALL_PACKAGES.includes(pkg),
    );
    if (unsupportedPackages.length > 0) {
      this.exitHelpfully(
        "build",
        `One or more of these packages isn't supported: ${unsupportedPackages.toString()}`,
      );
    }
  }

  public validateDelete(options: Options_Cli) {
    const { user } = options;
    if (!user || typeof user !== "string") {
      this.exitHelpfully("delete", "You must supply a user");
    }
  }

  private _getBuildOptions() {
    const buildOpts: Options_Cli_Build = {};

    const buildCmd = this.program.commands.find(
      (cmd) => cmd.name() === "build",
    );
    if (buildCmd) {
      const packages = this.program.args[1]?.split(",");
      if (packages) {
        buildOpts.packages = packages;
      }

      const environment = buildCmd?.opts()[
        "environment"
      ] as Options_Cli_Build["environment"];
      if (environment) {
        buildOpts.environment = environment;
      }

      const clientId = buildCmd?.opts()[
        "clientId"
      ] as Options_Cli_Build["clientId"];
      if (clientId) {
        buildOpts.clientId = clientId;
      }
    }
    return buildOpts;
  }

  private _getDeleteOptions() {
    const deleteOpts: Options_Cli_Delete = {};

    const deleteCmd = this.program.commands.find(
      (cmd) => cmd.name() === "delete",
    );
    if (deleteCmd) {
      const user = deleteCmd?.opts()["user"] as Options_Cli["user"];
      if (user) {
        deleteOpts.user = user;
      }
    }

    return deleteOpts;
  }

  private _mergeOptions = (): Options_Cli => {
    const _options = this.program.opts();
    let options: Options_Cli = {
      ..._options,
      force: _options["force"] === true,
    };

    const buildOptions = this._getBuildOptions();
    if (Object.keys(buildOptions).length > 0) {
      options = {
        ...options,
        ...buildOptions,
      };
    }

    const deleteOptions = this._getDeleteOptions();
    if (Object.keys(deleteOptions).length > 0) {
      options = {
        ...options,
        ...deleteOptions,
      };
    }

    return options;
  };

  private _validateOptions(options: Options_Cli) {
    const { data: rootData, error: rootError } =
      Schema_Options_Cli_Root.safeParse(options);
    if (rootError) {
      this.exitHelpfully(
        "root",
        `Invalid CLI options: ${rootError.toString()}`,
      );
    }

    const { data: buildData, error: buildError } =
      Schema_Options_Cli_Build.safeParse(options);
    if (buildError) {
      this.exitHelpfully(
        "build",
        `Invalid build options: ${buildError.toString()}`,
      );
    }

    const { data: deleteData, error: deleteError } =
      Schema_Options_Cli_Delete.safeParse(options);
    if (deleteError) {
      this.exitHelpfully(
        "delete",
        `Invalid delete options: ${deleteError.toString()}`,
      );
    }

    const data: Options_Cli = { ...rootData, ...buildData, ...deleteData };
    return data;
  }
}
