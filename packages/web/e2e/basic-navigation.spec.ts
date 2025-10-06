import { expect, test } from "@playwright/test";

test.describe("Basic Navigation", () => {
  test("should load the main page and redirect to login", async ({ page }) => {
    // Navigate to the main page
    await page.goto("/");

    // Should redirect to login/onboarding flow
    await expect(page).toHaveURL(/\/login/);

    // Should see the welcome step
    await expect(page.locator("text=Welcome")).toBeVisible();
  });
});
