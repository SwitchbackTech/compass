import { expect, test } from "@playwright/test";
import { prepareCalendarPage } from "../utils/event-test-utils";

test("A opens Share availability without creating an event draft", async ({
  page,
}) => {
  await prepareCalendarPage(page);

  await page.keyboard.press("a");

  const availabilityPanel = page.getByRole("region", {
    name: "Share availability",
  });
  await expect(availabilityPanel).toBeVisible();
  await expect(page.getByRole("form")).toHaveCount(0);

  await page.keyboard.press("Escape");

  await expect(availabilityPanel).toHaveCount(0);
  await expect(page.getByRole("form")).toHaveCount(0);
});
