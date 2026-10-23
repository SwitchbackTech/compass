import { expect, test } from "@playwright/test";
import { COMPASS_SYNTHETIC_ACCOUNT_HEADER } from "@core/analytics/synthetic-account.util";
import {
  createEventTitle,
  expectTimedEventVisible,
  fillTitleAndSaveEventForm,
} from "../utils/event-test-utils";

const provider = (process.env.PROD_JOURNEY_PROVIDER ?? "").toLowerCase();

const requireEnv = (name: string): string => {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(
      `Missing ${name}. Add it to the prod-journey GitHub Environment before this leg can run.`,
    );
  }
  return value;
};

const credentialEnvPrefix = (): string => {
  if (provider === "google") return "PROD_JOURNEY_GOOGLE";
  if (provider === "microsoft") return "PROD_JOURNEY_MICROSOFT";
  if (provider === "apple") return "PROD_JOURNEY_APPLE";
  throw new Error(
    `PROD_JOURNEY_PROVIDER must be google, microsoft, or apple (got "${provider}").`,
  );
};

test.use({ storageState: { cookies: [], origins: [] } });
test.use({ viewport: { width: 1280, height: 800 } });
test.use({
  extraHTTPHeaders: {
    [COMPASS_SYNTHETIC_ACCOUNT_HEADER]: "true",
  },
});

test(`prod full journey (${provider || "unset"})`, async ({ page }) => {
  test.skip(
    process.env.PROD_JOURNEY_ENABLED !== "1",
    "Set PROD_JOURNEY_ENABLED=1 to run against production",
  );

  const prefix = credentialEnvPrefix();
  const accountEmail = requireEnv(`${prefix}_EMAIL`);
  const accountPassword = requireEnv(`${prefix}_PASSWORD`);

  await page.addInitScript(() => {
    localStorage.setItem("compass.onboarding.has-seen-welcome", "true");
    localStorage.setItem(
      "compass.onboarding.has-seen-shortcut-showcase",
      "true",
    );
    localStorage.setItem("compass.onboarding.first-event-done", "dismissed");
  });

  const uniqueEmail = accountEmail.includes("@")
    ? accountEmail.replace("@", `+journey${Date.now()}@`)
    : `journey.${Date.now()}@compasscaltest.invalid`;
  const password = accountPassword;

  await page.goto("/week?auth=signup", { waitUntil: "domcontentloaded" });
  await page.getByLabel("Name").fill("Prod Journey");
  await page.getByLabel("Email").fill(uniqueEmail);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign up" }).click();

  const trialDialog = page.getByRole("dialog", {
    name: "Start your 7-day free trial",
  });
  await expect(trialDialog).toBeVisible({ timeout: 120_000 });

  let checkoutClientSecret = "";
  page.on("response", async (response) => {
    const url = new URL(response.url());
    if (!url.pathname.endsWith("/api/billing/checkout/session")) return;
    if (!response.ok()) return;
    try {
      const body = (await response.json()) as { clientSecret?: string };
      checkoutClientSecret = body.clientSecret ?? "";
    } catch {
      // ignore
    }
  });

  await expect
    .poll(() => checkoutClientSecret.length > 0, { timeout: 120_000 })
    .toBe(true);

  const stripeFrame = page
    .frameLocator('iframe[name*="stripe"], iframe[src*="stripe"]')
    .first();
  await stripeFrame.locator("input").first().waitFor({ timeout: 120_000 });
  await stripeFrame.getByLabel("Card number").fill("4242424242424242");
  await stripeFrame.getByLabel("Expiration").fill("12/34");
  await stripeFrame.getByLabel("CVC").fill("123");
  await stripeFrame.getByLabel("ZIP").fill("80202");

  await page.getByRole("button", { name: "Start free trial" }).click();
  await expect(trialDialog).toBeHidden({ timeout: 180_000 });

  const createdTitle = createEventTitle("Prod journey create");
  await page.keyboard.press("c");
  await fillTitleAndSaveEventForm(page, createdTitle);
  await expectTimedEventVisible(page, createdTitle);

  await page.getByRole("button", { name: "Settings" }).click();
  await page.getByRole("button", { name: "Cancel subscription" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Cancel subscription" })
    .click();
  await expect(page.getByText(/canceled|cancelled/i)).toBeVisible({
    timeout: 60_000,
  });

  const editedTitle = createEventTitle("Prod journey edit");
  await page.getByRole("button", { name: createdTitle }).click();
  await page.getByLabel("Title").fill(editedTitle);
  await page.getByRole("button", { name: "Save" }).click();
  await expectTimedEventVisible(page, editedTitle);

  await page.getByRole("button", { name: "Log out" }).click();
  await page
    .getByRole("dialog", { name: /log out/i })
    .getByRole("button", { name: "Log out" })
    .click();

  await page.goto("/week?auth=login", { waitUntil: "domcontentloaded" });
  await page.getByLabel("Email").fill(uniqueEmail);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
  await expectTimedEventVisible(page, editedTitle);

  await page.getByRole("button", { name: "Delete account" }).click();
  const deleteDialog = page.getByRole("dialog", {
    name: /delete your account/i,
  });
  await deleteDialog.getByRole("textbox").fill("delete my compass account");
  await deleteDialog.getByRole("button", { name: "Delete account" }).click();
  await expect(page.getByText(/until our sails cross paths/i)).toBeVisible({
    timeout: 60_000,
  });
});
