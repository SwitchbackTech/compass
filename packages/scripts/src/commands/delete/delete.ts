import { CLI_ENV } from "@scripts/common/cli.constants";
import { log } from "@scripts/common/cli.utils";
import inquirer, { type QuestionCollection } from "inquirer";
import open from "open";
import supertokensUserCleanupService from "@backend/auth/services/supertokens/supertokens.user-cleanup.service";
import mongoService from "@backend/common/services/mongo.service";
import { findCompassUsersBy } from "@backend/user/queries/user.queries";
import userService from "@backend/user/services/user.service";
import { type Summary_Delete } from "@backend/user/types/user.types";
import { BROWSER_MAP } from "./delete.constants";
import {
  type BrowserCleanupPromptAnswers,
  type DeleteConfirmPromptAnswers,
  type SupportedBrowser,
} from "./delete.types";

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

const getCleanupUrl = (): string => {
  return `${CLI_ENV.FRONTEND_URL}/cleanup`;
};

const normalizeEmail = (value: string): string => value.trim().toLowerCase();

const summarizeDeleteError = (error: unknown): { message: string } => {
  if (error instanceof Error) {
    return { message: error.message };
  }

  return { message: "Unknown delete failure" };
};

/**
 * Opens browser to cleanup page without prompting (for force mode)
 */
const forceBrowserCleanup = async (): Promise<void> => {
  const cleanupUrl = getCleanupUrl();
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
};

/**
 * Prompts user to clear browser data after account deletion
 */
const promptBrowserCleanup = async (): Promise<void> => {
  const cleanupUrl = getCleanupUrl();

  log.info("\n[Browser Data Cleanup]");
  log.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  log.info("Your account has been deleted from Compass backend services.");
  log.info("However, browser storage may still contain:");
  log.info("  • Session cookies (SuperTokens)");
  log.info("  • LocalStorage data (preferences)");
  log.info("  • IndexedDB (compass-local database with tasks and events)");
  log.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  const questions: QuestionCollection<BrowserCleanupPromptAnswers> = [
    {
      type: "confirm",
      name: "cleanup",
      message: "Would you like to clear browser data for a fresh start?",
      default: true,
    },
  ];

  const promptResult =
    await inquirer.prompt<BrowserCleanupPromptAnswers>(questions);

  if (promptResult.cleanup) {
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
  log.info(`Deleting Compass account data for users matching: ${user}`);

  const isEmail = user.includes("@");
  const normalizedUser = isEmail ? normalizeEmail(user) : user;
  const idKeyword = isEmail ? "email" : "_id";

  const users = await findCompassUsersBy(idKeyword, normalizedUser);

  const totalSummary: Summary_Delete[] = [];
  const failures: Array<{ message: string }> = [];
  for (const user of users) {
    const userId = user?._id.toString();
    const gcalAccess = !!user.google?.gRefreshToken;

    try {
      const summary = await userService.deleteCompassDataForUser(
        userId,
        gcalAccess,
      );
      totalSummary.push(summary);
    } catch (error) {
      const failure = summarizeDeleteError(error);
      failures.push(failure);
    }
  }

  const cleanupOrphanedAuthData = async () => {
    const summary = isEmail
      ? await supertokensUserCleanupService.cleanupByEmail(normalizedUser)
      : await supertokensUserCleanupService.cleanupByExternalUserId(
          normalizedUser,
        );

    const hasCleanup =
      (summary.superTokensUsers ?? 0) > 0 ||
      (summary.superTokensMappings ?? 0) > 0 ||
      (summary.superTokensMetadata ?? 0) > 0;

    if (hasCleanup || totalSummary.length === 0) {
      totalSummary.push(summary);
    }
  };

  try {
    await cleanupOrphanedAuthData();
  } catch (error) {
    const failure = summarizeDeleteError(error);
    failures.push(failure);
  }

  log.success(`Deleted: ${JSON.stringify(totalSummary, null, 2)}`);

  if (failures.length > 0) {
    failures.forEach(({ message }) => {
      log.error(message);
    });

    throw new Error("Delete completed with auth cleanup failures.");
  }
};

export const startDeleteFlow = async (user: string, force = false) => {
  await mongoService.start();

  if (force === true) {
    log.warning("\n! FORCE MODE ENABLED !");
    log.warning("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    log.warning("Proceeding without confirmation prompts.");
    log.warning("All data will be deleted immediately.");
    log.warning("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    try {
      log.info(`Deleting ${user}'s Compass account data ...`);
      await deleteCompassDataForMatchingUsers(user);
      await forceBrowserCleanup();
      process.exit(0);
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  }

  const questions: QuestionCollection<DeleteConfirmPromptAnswers> = [
    {
      type: "confirm",
      name: "delete",
      message: `This will delete all Compass account and auth data for all users matching: >> ${user} <<\nContinue?`,
    },
  ];

  try {
    const promptResult =
      await inquirer.prompt<DeleteConfirmPromptAnswers>(questions);

    if (!promptResult.delete) {
      log.info("No worries, see ya next time");
      process.exit(0);
    }

    log.info(`Okie dokie, deleting ${user}'s Compass account data ...`);
    await deleteCompassDataForMatchingUsers(user);
    await promptBrowserCleanup();
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};
