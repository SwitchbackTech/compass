import path from "path";
import dotenv from "dotenv";
dotenv.config({
  path: path.resolve(process.cwd(), "packages/backend/.env"),
});
import { Command } from "commander";

import { runBuild } from "./commands/build";
import { ALL_PACKAGES, CATEGORY_VM } from "./common/cli.constants";
import { startDeleteFlow } from "./commands/delete";
import { log } from "./common/cli.utils";

const runScript = async () => {
  const exitHelpfully = (msg?: string) => {
    msg && log.error(msg);
    console.log(program.helpInformation());
    process.exit(1);
  };

  const program = new Command();
  program.option(
    `-e, --environment [${CATEGORY_VM.STAG}|${CATEGORY_VM.PROD}]`,
    "specify environment"
  );
  program.option("-f, --force", "forces operation, no cautionary prompts");
  program.option(
    "-u, --user [id|email]",
    "specifies which user to run script for"
  );

  program
    .command("build")
    .description("build compass package(s)")
    .argument(
      `[${ALL_PACKAGES.join("|")}]`,
      "package(s) to build, separated by comma"
    )
    .option("--skip-env", "skips copying env files to build");

  program
    .command("delete")
    .description("deletes users data from compass database");

  program.parse(process.argv);

  const options = program.opts();
  const cmd = program.args[0];

  switch (true) {
    case cmd === "build": {
      await runBuild(options);
      break;
    }
    case cmd === "delete": {
      const force = options["force"] as boolean;
      const user = options["user"] as string;

      if (!user || typeof user !== "string") {
        exitHelpfully("You must supply a user");
      }

      await startDeleteFlow(user, force);
      break;
    }
    default:
      exitHelpfully("Unsupported cmd");
  }
};

runScript().catch((err) => {
  console.log(err);
  process.exit(1);
});
