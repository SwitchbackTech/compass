import { type Command } from "commander";
import { log } from "./common/cli.utils";

export class CliValidator {
  private program: Command;

  constructor(program: Command) {
    this.program = program;
  }

  public exitHelpfully(msg?: string) {
    msg && log.error(msg);

    console.log(this.program.helpInformation());

    process.exit(1);
  }
}
