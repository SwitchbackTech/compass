import { expect, type Page, test } from "@playwright/test";
import {
  prepareOAuthTestPage,
  waitForAppReady,
} from "../utils/oauth-test-utils";

const AUTH_STORAGE_KEY = "compass.auth";

const logoutDialog = (page: Page) =>
  page.getByRole("dialog", { name: "Log out?" });

const loginDialog = (page: Page) =>
  page.getByRole("dialog", { name: "Hey, welcome back" });

const getAuthStorage = (page: Page) =>
  page.evaluate((key) => localStorage.getItem(key), AUTH_STORAGE_KEY);

const markPageAuthenticated = async (page: Page) => {
  await page.waitForFunction(
    () => typeof window.__COMPASS_E2E_HOOKS__?.setAuthenticated === "function",
    { timeout: 10000 },
  );

  await page.evaluate((key) => {
    localStorage.setItem(key, JSON.stringify({ hasAuthenticated: true }));
    window.__COMPASS_E2E_HOOKS__?.setAuthenticated(true);
  }, AUTH_STORAGE_KEY);

  await expect
    .poll(() => getAuthStorage(page), { timeout: 5000 })
    .not.toBeNull();
  await expect(loginDialog(page)).toHaveCount(0);
};

const waitForLogoutCommand = async (page: Page) => {
  await page.getByRole("button", { name: "Open command palette" }).click();
  await expect(page.getByText("Log Out [z]")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByText("Log Out [z]")).toHaveCount(0);
};

const pressLogoutShortcut = async (page: Page) => {
  await page.evaluate(() => {
    (document.activeElement as HTMLElement | null)?.blur?.();
  });
  await page.keyboard.press("z");
};

const expectAuthStoragePresent = async (page: Page) => {
  await expect
    .poll(() => getAuthStorage(page), { timeout: 5000 })
    .not.toBeNull();
};

const expectLoggedOut = async (page: Page) => {
  await expect
    .poll(
      async () => {
        const authStorage = await getAuthStorage(page);
        const isLoginDialogVisible = await loginDialog(page)
          .isVisible()
          .catch(() => false);

        return authStorage === null || isLoginDialogVisible;
      },
      { timeout: 10000 },
    )
    .toBe(true);
};

test.describe("Logout confirmation", () => {
  test("keeps the user signed in after Cancel and signs out after Log out", async ({
    page,
  }) => {
    await prepareOAuthTestPage(page);
    await page.goto("/week");
    await waitForAppReady(page);
    await markPageAuthenticated(page);
    await waitForLogoutCommand(page);
    await expect(page.getByRole("dialog")).toHaveCount(0);

    await pressLogoutShortcut(page);
    await expect(logoutDialog(page)).toBeVisible();
    await expectAuthStoragePresent(page);

    await logoutDialog(page).getByRole("button", { name: "Cancel" }).click();
    await expect(logoutDialog(page)).toHaveCount(0);
    await expectAuthStoragePresent(page);

    await pressLogoutShortcut(page);
    await expect(logoutDialog(page)).toBeVisible();

    await logoutDialog(page).getByRole("button", { name: "Log out" }).click();
    await expect(logoutDialog(page)).toHaveCount(0);
    await expectLoggedOut(page);
  });
});
