import path from "path";
import dotenv from "dotenv";
dotenv.config({
  path: path.resolve(process.cwd(), "packages/backend/.env"),
});
import { Command } from "commander";
import mongoService from "@backend/common/services/mongo.service";

import { runBuild } from "./commands/build";
import { Category_VM } from "./common/cli.types";

mongoService;

const runScript = async () => {
  const exitHelpfully = (msg?: string) => {
    msg && console.log(msg);
    console.log(program.helpInformation());
    process.exit(1);
  };

  const program = new Command();
  program.option("-b, --build", "builds packages");
  program.option("-d, --delete", "deletes users data from compass database");
  program.option(
    "-e --environment <environment>",
    "specify environment (`Category_VM` value)"
  );
  program.option("-f, --force", "forces operation, no cautionary prompts");
  program.option(
    "-p, --packages [pkgs...]",
    "specifies which packages to build"
  );
  program.option("-u, --user <id>", "specifies which user to run script for");

  program.parse(process.argv);

  const options = program.opts();

  if (Object.keys(options).length === 0) {
    exitHelpfully();
  }

  switch (true) {
    case options["build"]: {
      const pckgs = options["packages"] as string[] | undefined;
      const env = options["environment"] as Category_VM | undefined;
      await runBuild(pckgs, env);
      break;
    }
    case options["delete"]: {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-var-requires
      const { startDeleteFlow } = require("./commands/delete");

      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      startDeleteFlow(
        options["user"] as string | null,
        options["force"] as boolean | undefined
      );
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
