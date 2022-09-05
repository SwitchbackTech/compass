import pkg from "inquirer";
const { prompt } = pkg;
import { BaseError } from "@core/errors/errors.base";
import { initSupertokens } from "@backend/common/middleware/supertokens.middleware";
import eventService from "@backend/event/services/event.service";
import priorityService from "@backend/priority/services/priority.service";
import { findCompassUsersBy } from "@backend/user/queries/user.queries";
import calendarService from "@backend/calendar/services/calendar.service";
import userService from "@backend/user/services/user.service";
import syncService from "@backend/sync/services/sync.service";
import compassAuthService from "@backend/auth/services/compass.auth.service";

export interface Summary_Delete {
  calendarlist?: number;
  events?: number;
  eventWatches?: number;
  priorities?: number;
  syncs?: number;
  user?: number;
  sessions?: number;
}

const deleteCompassDataForUser = async (userId: string) => {
  const summary: Summary_Delete = {};

  try {
    const priorities = await priorityService.deleteAllByUser(userId);
    summary.priorities = priorities.deletedCount;

    const calendars = await calendarService.deleteAllByUser(userId);
    summary.calendarlist = calendars.deletedCount;

    const events = await eventService.deleteAllByUser(userId);
    summary.events = events.deletedCount;

    const { watchStopCount } = await syncService.stopWatches(userId);
    summary.eventWatches = watchStopCount;

    initSupertokens();
    const { sessionsRevoked } = await compassAuthService.revokeSessionsByUser(
      userId
    );
    summary.sessions = sessionsRevoked;

    const syncs = await syncService.deleteAllByUser(userId);
    summary.syncs = syncs.deletedCount;

    const _user = await userService.deleteUser(userId);
    summary.user = _user.deletedCount;
    return summary;
  } catch (e) {
    const _e = e as BaseError;
    console.log("Stopped early because:", _e.description || _e);

    const _user = await userService.deleteUser(userId);
    summary.user = _user.deletedCount;

    return summary;
  }
};

export const deleteCompassDataForMatchingUsers = async (user: string) => {
  console.log(`Deleting Compass data for users matching: ${user}`);

  const isGmail = user.includes("@gmail.com");
  const idKeyword = isGmail ? "email" : "_id";

  const users = await findCompassUsersBy(idKeyword, user);

  const totalSummary: Summary_Delete[] = [];
  for (const user of users) {
    const userId = user?._id.toString();
    const summary = await deleteCompassDataForUser(userId);
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

// const runOnceDbReady = () => {
//   // import mongoService from "@backend/common/services/mongo.service";
//   /* wait for DB before running */
//   let isReady = false;
//   const checkDB = () => {
//     // const connected = mongoService.isConnected();
//     const connected = false;
//     if (connected) {
//       isReady = true;
//     }
//   };

//   checkDB();
//   if (isReady) {
//     console.log("running func...");
//     // void runScript();
//   } else {
//     setTimeout(() => {
//       checkDB();
//       if (isReady) {
//         console.log("running func..");
//       }
//     }, 2000);
//   }
// };
