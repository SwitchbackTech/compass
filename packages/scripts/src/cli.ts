import path from "path";
import dotenv from "dotenv";
dotenv.config({
  // assumes script is run from dev root
  path: path.resolve(process.cwd(), "packages/backend/.env"),
});
import { Command } from "commander";
import mongoService from "@backend/common/services/mongo.service";

import { analyzeWeb } from "./commands/analyze";
import { runBuild } from "./commands/build";
import { copyToVM } from "./commands/scp";
import { getPckgsTo, getVmInfo } from "./common/cli.utils";

mongoService;

const runScript = async () => {
  const exitHelpfully = (msg?: string) => {
    msg && console.log(msg);
    console.log(program.helpInformation());
    process.exit(1);
  };

  const program = new Command();
  program.option("-a, --analyze", "analyzes prod builds");
  program.option("-b, --build", "builds packages");
  program.option("-c, --scp", "copies existing builds to VM");
  program.option("-d, --delete", "deletes users data from compass database");
  program.option("-f, --force", "forces operation, no cautionary prompts");
  program.option("-u, --user <id>", "specifies which user to run script for");

  program.parse(process.argv);

  const options = program.opts();

  if (Object.keys(options).length === 0) {
    exitHelpfully();
  }

  switch (true) {
    case options["analyze"]: {
      analyzeWeb();
      break;
    }
    case options["build"]: {
      await runBuild();
      break;
    }
    case options["scp"]: {
      console.log(
        "TODO - update .envs in build first -- might be re-using old one"
      );
      process.exit(1);
      const pckgs = await getPckgsTo("scp");
      const vmInfo = await getVmInfo();
      copyToVM(pckgs, vmInfo);
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
      exitHelpfully("unsupported cmd");
  }
};

runScript().catch((err) => {
  console.log(err);
  process.exit(1);
});
// const connectToDb = async () => {
//   let isReady = false;

//   mongoService.client?.once("connection", () => {
//     console.log("!!\n\nconnected");
//   });
//   const checkDB = () => {
//     const connected = mongoService.isConnected();
//     if (connected) {
//       isReady = true;
//     }
//   };

//   const wait = () => {
//     console.log("waiting ...");
//     setTimeout(() => {
//       checkDB();
//       if (isReady) {
//         console.log("running func after waiting..");
//       } else wait();
//     }, 2000);
//   };

//   checkDB();

//   if (isReady) {
//     console.log("running func...");
//     return Promise.resolve();
//   } else {
//     wait();
//     checkDB();
//     if (isReady) return Promise.resolve();
//   }
// };
