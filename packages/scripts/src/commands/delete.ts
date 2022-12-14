import pkg from "inquirer";
const { prompt } = pkg;
import { findCompassUsersBy } from "@backend/user/queries/user.queries";
import userService from "@backend/user/services/user.service";

export interface Summary_Delete {
  calendarlist?: number;
  events?: number;
  eventWatches?: number;
  priorities?: number;
  syncs?: number;
  user?: number;
  sessions?: number;
}

export const deleteCompassDataForMatchingUsers = async (user: string) => {
  // userService.mongoService.client?.once("connection", () => {
  //   console.log("**!!\n\nconnected");
  // });
  // await connectToDb();

  console.log(`Deleting Compass data for users matching: ${user}`);

  const isGmail = user.includes("@gmail.com");
  const idKeyword = isGmail ? "email" : "_id";

  const users = await findCompassUsersBy(idKeyword, user);

  const totalSummary: Summary_Delete[] = [];
  for (const user of users) {
    const userId = user?._id.toString();
    const summary = await userService.deleteCompassDataForUser(userId);
    totalSummary.push(summary);
  }

  console.log(`Deleted: ${JSON.stringify(totalSummary, null, 2)}`);
};

export const startDeleteFlow = async (user: string | null, force?: boolean) => {
  if (!user) {
    console.log("no user");
    process.exit(1);
  }

  if (force === true) {
    await deleteCompassDataForMatchingUsers(user);
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
        console.log(`Okie dokie, deleting ${user}'s Compass data ...`);
        deleteCompassDataForMatchingUsers(user)
          .catch((e) => console.log(e))
          .finally(() => process.exit(0));
      } else {
        console.log("No worries, see ya next time");
      }
    })
    .catch((err) => console.log(err));
};
