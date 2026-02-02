import pkg from "inquirer";
import open, { apps } from "open";
import { CLI_ENV, ENVIRONMENT } from "@scripts/common/cli.constants";
import { Environment_Cli } from "@scripts/common/cli.types";
import { log } from "@scripts/common/cli.utils";
import mongoService from "@backend/common/services/mongo.service";
import { findCompassUsersBy } from "@backend/user/queries/user.queries";
import userService from "@backend/user/services/user.service";
import { Summary_Delete } from "@backend/user/types/user.types";

const { prompt } = pkg;

type SupportedBrowser = "chrome" | "firefox" | "brave" | "edge" | "safari";

const BROWSER_MAP: Record<SupportedBrowser, string | readonly string[]> = {
  chrome: apps.chrome,
  firefox: apps.firefox,
  brave: apps.brave,
  edge: apps.edge,
  safari: "safari",
};

const getBrowserApp = (): { name: string | readonly string[] } | undefined => {
  const browserName = CLI_ENV.DEV_BROWSER?.toLowerCase();
  if (!browserName) return undefined;

  const browserApp = BROWSER_MAP[browserName as SupportedBrowser];
  if (!browserApp) {
    log.warning(
      `Unknown browser "${CLI_ENV.DEV_BROWSER}". Supported: ${Object.keys(BROWSER_MAP).join(", ")}. Falling back to default.`,
    );
    return undefined;
  }
  return { name: browserApp };
};

/**
 * Gets the appropriate cleanup URL based on NODE_ENV
 */
const getCleanupUrl = (): string => {
  const env = process.env.NODE_ENV as Environment_Cli;

  if (env === ENVIRONMENT.PROD) {
    if (!CLI_ENV.PROD_DOMAIN) {
      throw new Error(
        'Unable to determine cleanup URL. NODE_ENV="production" but PROD_DOMAIN is not set.',
      );
    }
    return `https://${CLI_ENV.PROD_DOMAIN}/cleanup`;
  }

  if (env === ENVIRONMENT.STAG) {
    if (!CLI_ENV.STAGING_DOMAIN) {
      throw new Error(
        'Unable to determine cleanup URL. NODE_ENV="staging" but STAGING_DOMAIN is not set.',
      );
    }
    return `https://${CLI_ENV.STAGING_DOMAIN}/cleanup`;
  }

  if (!CLI_ENV.LOCAL_WEB_DOMAIN) {
    throw new Error(
      'Unable to determine cleanup URL. NODE_ENV="local" but LOCAL_WEB_DOMAIN is not set.',
    );
  }
  return `http://${CLI_ENV.LOCAL_WEB_DOMAIN}/cleanup`;
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
    const browserApp = getBrowserApp();
    const browserName = CLI_ENV.DEV_BROWSER || "default";

    log.info(`\nOpening ${browserName} browser to clear local data...`);

    if (browserApp) {
      await open(cleanupUrl, { app: browserApp });
    } else {
      await open(cleanupUrl);
    }

    log.success(
      "Browser cleanup initiated. Check your browser to confirm completion.",
    );
  } else {
    log.info("\nSkipping browser cleanup.");
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
