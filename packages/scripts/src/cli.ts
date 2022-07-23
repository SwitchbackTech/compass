import path from "path";
import dotenv from "dotenv";
dotenv.config({
  // assumes script is run from dev root
  path: path.resolve(process.cwd(), "packages/backend/.env"),
});
import { Command } from "commander";
import pkg from "inquirer";
const { prompt } = pkg;
import mongoService from "@backend/common/services/mongo.service";

import { deleteAllCompassDataForUser } from "./delete";

const runScript = () => {
  /* setup CLI */
  const program = new Command();
  program.option("-d, --delete", "deletes users data from compass database");
  program.option("-u, --user <type>", "specifies which user to run script for");

  program.parse(process.argv);

  const options = program.opts();
  const user = options["user"] as string;

  if (Object.keys(options).length === 0 || !user) {
    console.log(program.helpInformation());
    process.exit();
  }

  // const testUser = "***REMOVED***@gmail.com";

  if (options["delete"]) {
    const questions = [
      {
        type: "input",
        name: "confirmed",
        message: `This will delete all Compass data for >> ${user} <<\nContinue? [enter: "yes"]`,
      },
    ];

    prompt(questions)
      .then((answersRd1: { confirmed: string }) => {
        if (answersRd1["confirmed"] === "yes") {
          console.log(`Okie dokie, deleting ${user}'s Compass data ...`);
          deleteAllCompassDataForUser(user).catch((e) => console.log(e));
        } else {
          console.log("No worries, see ya next time");
          process.exit();
        }
      })
      .catch((err) => console.log(err));
  }
};

const runScriptOnceDbReady = () => {
  /* wait for DB before running */
  let isReady = false;
  const checkDB = () => {
    if (mongoService.isConnected()) {
      isReady = true;
    }
  };

  checkDB();
  if (isReady) {
    runScript();
  } else {
    setTimeout(() => {
      checkDB();
      if (isReady) {
        runScript();
      }
    }, 2000);
  }
};

runScriptOnceDbReady();
