import path from "path";
import dotenv from "dotenv";
dotenv.config({
  path: path.resolve(process.cwd(), "packages/backend/.env"),
});
import { Command } from "commander";

import { runBuild } from "./commands/build";
import { ALL_PACKAGES, CATEGORY_VM } from "./common/cli.constants";
import { startDeleteFlow } from "./commands/delete";
import {
  Options_Cli,
  Options_Cli_Build,
  Options_Cli_Delete,
  Schema_Options_Cli_Build,
  Schema_Options_Cli_Delete,
  Schema_Options_Cli_Root,
} from "./common/cli.types";
import { getPckgsTo, log } from "./common/cli.utils";

class CompassCli {
  private program: Command;
  private options: Options_Cli;

  constructor(args: string[]) {
    this.program = this._createProgram();
    this.program.parse(args);
    this.options = this._getCliOptions();
  }

  public async run() {
    const { force, user } = this.options;
    const cmd = this.program.args[0];

    switch (true) {
      case cmd === "build": {
        await this._validateBuild();
        await runBuild(this.options);
        break;
      }
      case cmd === "delete": {
        this._validateDelete();
        await startDeleteFlow(user as string, force);
        break;
      }
      default:
        this._exitHelpfully("root", `${cmd as string} is not a supported cmd`);
    }
  }

  private _createProgram(): Command {
    const program = new Command();

    program.option("-f, --force", "force operation, no cautionary prompts");

    program
      .command("build")
      .description("build compass package")
      .argument(
        `[${ALL_PACKAGES.join(" | ")}]`,
        "package to build (only provide 1)"
      )
      .option(
        "-c, --clientId <clientId>",
        "google client id to inject into build"
      )
      .option(
        `-e, --environment [${CATEGORY_VM.STAG} | ${CATEGORY_VM.PROD}]`,
        "specify environment"
      );

    program
      .command("delete")
      .description("delete user data from compass database")
      .option(
        "-u, --user [id | email]",
        "specify which user to run script for"
      );
    return program;
  }

  private _exitHelpfully(cmd: "root" | "build" | "delete", msg?: string) {
    msg && log.error(msg);

    if (cmd === "root") {
      console.log(this.program.helpInformation());
    } else {
      const command = this.program.commands.find(
        (c) => c.name() === cmd
      ) as Command;
      console.log(command.helpInformation());
    }

    process.exit(1);
  }

  private _getBuildOptions() {
    const buildOpts: Options_Cli_Build = {};

    const buildCmd = this.program.commands.find(
      (cmd) => cmd.name() === "build"
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

  private _getCliOptions(): Options_Cli {
    const options = this._mergeOptions();
    const validOptions = this._validateOptions(options);

    console.log("options", options);
    console.log("validOptions:", validOptions);
    return validOptions;
  }

  private _getDeleteOptions() {
    const deleteOpts: Options_Cli_Delete = {};

    const deleteCmd = this.program.commands.find(
      (cmd) => cmd.name() === "delete"
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

  private async _validateBuild() {
    if (!this.options.packages) {
      this.options.packages = await getPckgsTo("build");
    }

    const unsupportedPackages = this.options.packages.filter(
      (pkg) => !ALL_PACKAGES.includes(pkg)
    );
    if (unsupportedPackages.length > 0) {
      this._exitHelpfully(
        "build",
        `One or more of these packages isn't supported: ${unsupportedPackages.toString()}`
      );
    }
  }

  private _validateDelete() {
    const { user } = this.options;
    if (!user || typeof user !== "string") {
      this._exitHelpfully("delete", "You must supply a user");
    }
  }

  private _validateOptions(options: Options_Cli) {
    const { data: rootData, error: rootError } =
      Schema_Options_Cli_Root.safeParse(options);
    if (rootError) {
      this._exitHelpfully(
        "root",
        `Invalid CLI options: ${rootError.toString()}`
      );
    }

    const { data: buildData, error: buildError } =
      Schema_Options_Cli_Build.safeParse(options);
    if (buildError) {
      this._exitHelpfully(
        "build",
        `Invalid build options: ${buildError.toString()}`
      );
    }

    const { data: deleteData, error: deleteError } =
      Schema_Options_Cli_Delete.safeParse(options);
    if (deleteError) {
      this._exitHelpfully(
        "delete",
        `Invalid delete options: ${deleteError.toString()}`
      );
    }

    const data: Options_Cli = { ...rootData, ...buildData, ...deleteData };
    return data;
  }
}

const cli = new CompassCli(process.argv);
cli.run().catch((err) => {
  console.log(err);
  process.exit(1);
});
