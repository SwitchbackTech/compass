import pkg from "inquirer";
const { prompt } = pkg;
import { findCompassUsersBy } from "@backend/user/queries/user.queries";
import userService from "@backend/user/services/user.service";
import mongoService from "@backend/common/services/mongo.service";
import { Summary_Delete } from "@backend/user/types/user.types";
import { log } from "@scripts/common/cli.utils";

mongoService;

export const deleteCompassDataForMatchingUsers = async (user: string) => {
  log.info(`Deleting Compass data for users matching: ${user}`);

  const isEmail = user.includes("@");
  const idKeyword = isEmail ? "email" : "_id";

  const users = await findCompassUsersBy(idKeyword, user);

  const totalSummary: Summary_Delete[] = [];
  for (const user of users) {
    const userId = user?._id.toString();
    const summary = await userService.deleteCompassDataForUser(userId);
    totalSummary.push(summary);
  }

  log.success(`Deleted: ${JSON.stringify(totalSummary, null, 2)}`);
};

export const startDeleteFlow = async (user: string, force = false) => {
  log.info("Connecting to db...");
  await mongoService.waitUntilConnected();

  if (force === true) {
    log.info(`Deleting ${user}'s Compass data ...`);
    await deleteCompassDataForMatchingUsers(user);
    process.exit(0);
  }

  const questions = [
    {
      type: "confirm",
      name: "delete",
      message: `This will delete all Compass data for all users matching: >> ${user} <<\nContinue?`,
    },
  ];

  prompt(questions)
    .then((a: { delete: boolean }) => {
      if (a.delete) {
        log.info(`Okie dokie, deleting ${user}'s Compass data ...`);
        deleteCompassDataForMatchingUsers(user)
          .catch((e) => console.log(e))
          .finally(() => process.exit(0));
      } else {
        log.info("No worries, see ya next time");
        process.exit(0);
      }
    })
    .catch((err) => console.log(err));
};
