import pkg from "inquirer";
import { log } from "@scripts/common/cli.utils";
import mongoService from "@backend/common/services/mongo.service";
import { findCompassUsersBy } from "@backend/user/queries/user.queries";
import userService from "@backend/user/services/user.service";
import { Summary_Delete } from "@backend/user/types/user.types";

const { prompt } = pkg;

/**
 * Gets the appropriate cleanup URL based on NODE_ENV
 */
const getCleanupUrl = (): string => {
  const env = process.env.NODE_ENV;

  if (env === "production") {
    return "https://compass.switchback.tech/cleanup";
  } else if (env === "staging") {
    return "https://staging.compass.switchback.tech/cleanup";
  }

  // Default to local development
  return "http://localhost:8080/cleanup";
};

/**
 * Prompts user to clear browser data after account deletion
 */
const promptBrowserCleanup = async (): Promise<void> => {
  const cleanupUrl = getCleanupUrl();

  log.info("\n[Browser Data Cleanup]");
  log.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  log.info("Your account has been deleted from the backend.");
  log.info("However, browser storage may still contain:");
  log.info("  • Session cookies (SuperTokens)");
  log.info("  • LocalStorage data (tasks, preferences)");
  log.info("  • IndexedDB (compass-local database)");
  log.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  const questions = [
    {
      type: "confirm",
      name: "cleanup",
      message: "Would you like to clear browser data for a fresh start?",
      default: true,
    },
  ];

  const answers = await prompt(questions);

  if (answers.cleanup) {
    log.info("\n[Cleanup Instructions]\n");
    log.info(`1. Open this URL in your browser:\n   ${cleanupUrl}\n`);
    log.info("2. The page will automatically:");
    log.info("   * Log you out of your session");
    log.info("   * Clear all localStorage data");
    log.info("   * Delete the IndexedDB database");
    log.info("   * Redirect you to the login page\n");
    log.success("Success: You'll have a completely clean slate!");
  } else {
    log.info("\n[Warning] Skipping browser cleanup.");
    log.info("Note: You can manually clear browser data later by visiting:");
    log.info(`   ${cleanupUrl}\n`);
  }
};

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
  await mongoService.start();

  if (force === true) {
    log.info(`Deleting ${user}'s Compass data ...`);
    await deleteCompassDataForMatchingUsers(user);
    await promptBrowserCleanup();
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
          .then(() => promptBrowserCleanup())
          .catch((e) => console.log(e))
          .finally(() => process.exit(0));
      } else {
        log.info("No worries, see ya next time");
        process.exit(0);
      }
    })
    .catch((err) => console.log(err));
};
