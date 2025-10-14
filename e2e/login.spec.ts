import { expect, test } from "@playwright/test";

test.describe("Login page", () => {
  test("shows the terminal welcome screen on desktop", async ({ page }) => {
    test.skip(test.info().project.name !== "chromium-desktop");

    await page.goto("/");
    await page.keyboard.press("Enter");
    await expect(page.getByText("COMPASS CALENDAR")).toBeVisible();
    await expect(page.getByText("Press Any Key to board")).toBeVisible();
  });

  test("shows the gangway waitlist gate on mobile", async ({ page }) => {
    test.skip(test.info().project.name !== "chromium-mobile");

    await page.goto("/");

    await expect(
      page.getByText("The gangway lowers only for the chosen.", {
        exact: false,
      }),
    ).toBeVisible();

    await expect(
      page.getByRole("button", { name: "BYPASS WAITLIST" }),
    ).toBeVisible();
  });
});
