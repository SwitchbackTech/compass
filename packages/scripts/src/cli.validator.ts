import { type Command } from "commander";
import {
  type Options_Cli,
  type Options_Cli_Delete,
  Schema_Options_Cli_Delete,
  Schema_Options_Cli_Root,
} from "./common/cli.types";
import { log } from "./common/cli.utils";

export class CliValidator {
  private program: Command;

  constructor(program: Command) {
    this.program = program;
  }

  public exitHelpfully(cmd: "root" | "delete" | "seed", msg?: string) {
    if (msg) {
      log.error(msg);
    }

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

  public validateDelete(options: Options_Cli) {
    const { user } = options;
    if (!user || typeof user !== "string") {
      this.exitHelpfully("delete", "You must supply a user");
    }
  }

  public validateSeed(options: Options_Cli) {
    const { user } = options;
    if (!user || typeof user !== "string") {
      this.exitHelpfully("seed", "You must supply a user");
    }
  }

  private _getDeleteOptions() {
    const deleteOpts: Options_Cli_Delete = {};

    const deleteCmd = this.program.commands.find(
      (cmd) => cmd.name() === "delete",
    );
    if (deleteCmd) {
      const opts = deleteCmd.opts();

      const user = opts["user"] as Options_Cli["user"];
      if (user) {
        deleteOpts.user = user;
      }

      deleteOpts.force = opts["force"] === true;
    }

    return deleteOpts;
  }

  private _getSeedOptions() {
    const seedOpts: Options_Cli_Delete = {};

    const seedCmd = this.program.commands.find((cmd) => cmd.name() === "seed");
    if (seedCmd) {
      const user = seedCmd?.opts()["user"] as Options_Cli["user"];
      if (user) {
        seedOpts.user = user;
      }
    }

    return seedOpts;
  }

  private _mergeOptions = (): Options_Cli => {
    const _options = this.program.opts();
    let options: Options_Cli = {
      ..._options,
    };

    const deleteOptions = this._getDeleteOptions();
    if (Object.keys(deleteOptions).length > 0) {
      options = {
        ...options,
        ...deleteOptions,
      };
    }

    const seedOptions = this._getSeedOptions();
    if (Object.keys(seedOptions).length > 0) {
      options = {
        ...options,
        ...seedOptions,
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

    const { data: deleteData, error: deleteError } =
      Schema_Options_Cli_Delete.safeParse(options);
    if (deleteError) {
      this.exitHelpfully(
        "delete",
        `Invalid delete options: ${deleteError.toString()}`,
      );
    }

    const data: Options_Cli = { ...rootData, ...deleteData };
    return data;
  }
}
