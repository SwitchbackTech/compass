import { expect, test } from "@playwright/test";
import {
  createEventTitle,
  fillTitleAndSaveEventForm,
  openEventForEditingWithKeyboard,
  openTimedEventFormWithKeyboard,
  prepareCalendarPage,
} from "../utils/event-test-utils";

test("description numbered lists support Enter, exit, and round-trip", async ({
  page,
}) => {
  await prepareCalendarPage(page);

  const title = createEventTitle("List notes");
  await openTimedEventFormWithKeyboard(page);

  const description = page.getByRole("textbox", { name: "Description" });
  await description.click();
  await page.getByRole("button", { name: "Numbered list" }).click();

  await page.keyboard.type("First item");
  await page.keyboard.press("Enter");
  await page.keyboard.type("Second item");
  await page.keyboard.press("Enter");
  await page.keyboard.type("Third item");
  await page.keyboard.press("Enter");
  await page.keyboard.press("Enter");
  await page.keyboard.type("After list");

  await expect(description.locator("ol > li")).toHaveCount(3);
  await expect(description.locator("ol + p")).toContainText("After list");

  await fillTitleAndSaveEventForm(page, title);

  await openEventForEditingWithKeyboard(page, title);
  const descriptionAgain = page.getByRole("textbox", { name: "Description" });
  await expect(descriptionAgain.locator("ol > li")).toHaveCount(3);
  await expect(descriptionAgain).toContainText("First item");
  await expect(descriptionAgain).toContainText("Second item");
  await expect(descriptionAgain).toContainText("Third item");
  await expect(descriptionAgain).toContainText("After list");
});
