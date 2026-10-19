import { expect, test } from "@playwright/test";
import { E2E_APP_CONFIG_VERSION } from "../utils/test-constants";

test.use({ storageState: { cookies: [], origins: [] } });
test.use({ viewport: { width: 1600, height: 900 } });

test("shows a Google connect prompt after three anonymous writes and dismisses permanently", async ({
  page,
}, testInfo) => {
  await page.route("**/api/config", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        version: E2E_APP_CONFIG_VERSION,
        providers: {
          google: { signIn: true, connect: true },
          microsoft: { signIn: false, connect: false },
          apple: { signIn: false, connect: false },
        },
      }),
    });
  });

  await page.addInitScript(
    (keys) => {
      localStorage.setItem(keys.hasSeenWelcome, "true");
      localStorage.setItem(keys.firstEventDone, "completed");
      localStorage.setItem(keys.writeCount, "3");
      localStorage.removeItem(keys.dismissed);
    },
    {
      hasSeenWelcome: "compass.onboarding.has-seen-welcome",
      firstEventDone: "compass.onboarding.first-event-done",
      writeCount: "compass.onboarding.anonymous-calendar-write-count",
      dismissed: "compass.onboarding.has-dismissed-local-mode-connect-prompt",
    },
  );

  await page.goto("/week", { waitUntil: "domcontentloaded" });

  const prompt = page.getByRole("complementary", { name: "Connect Google" });
  await expect(prompt).toBeVisible();
  await expect(prompt).toContainText(
    "Connect Google to sync your events and start your free trial.",
  );
  await page.screenshot({
    path: testInfo.outputPath("local-mode-connect-prompt-demo.png"),
  });

  await prompt.getByRole("button", { name: "Dismiss" }).click();
  await expect(prompt).toHaveCount(0);

  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(prompt).toHaveCount(0);
});
