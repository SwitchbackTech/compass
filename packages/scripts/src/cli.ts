import path from "path";
import dotenv from "dotenv";
dotenv.config({
  // assumes script is run from dev root
  path: path.resolve(process.cwd(), "packages/backend/.env"),
});
import { Command } from "commander";

import { runBuild } from "./commands/build";
import { updatePckgs } from "./commands/update";

const runScript = async () => {
  const exitHelpfully = (msg?: string) => {
    msg && console.log(msg);
    console.log(program.helpInformation());
    process.exit(1);
  };

  const program = new Command();
  program.option("-b, --build", "builds packages");
  program.option("-d, --delete", "deletes users data from compass database");
  program.option("-u, --user <id>", "specifies which user to run script for");
  program.option("-f, --force", "forces operation, no cautionary prompts");

  program.parse(process.argv);

  const options = program.opts();

  if (Object.keys(options).length === 0) {
    exitHelpfully();
  }

  switch (true) {
    case options["build"]:
      await runBuild();
      break;
    case options["delete"]: {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-var-requires
      const { startDeleteFlow } = require("./commands/delete");
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      await startDeleteFlow(
        options["user"] as string | null,
        options["force"] as boolean | undefined
      );
      break;
    }
    case options["update"]: {
      await updatePckgs();
      break;
    }
    default:
      exitHelpfully("unsupported cmd");
  }
};

runScript().catch((err) => {
  console.log(err);
  process.exit(1);
});
