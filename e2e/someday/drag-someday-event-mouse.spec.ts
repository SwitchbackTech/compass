import { expect, test } from "@playwright/test";
import {
  createEventTitle,
  expectSomedayEventVisible,
  fillTitleAndSaveEventForm,
  getMainGridPoint,
  openSomedayEventFormWithMouse,
  prepareCalendarPage,
} from "../utils/event-test-utils";

test.skip(
  ({ isMobile }) => isMobile,
  "Mouse flows are desktop-only in week view.",
);

test("shows a timed-grid preview while dragging a someday event", async ({
  page,
}) => {
  await prepareCalendarPage(page);
  await page.getByRole("button", { name: "Next week" }).click();
  await page.locator("#mainGrid").waitFor({ state: "visible" });

  const title = createEventTitle("Someday Drag Preview");
  await openSomedayEventFormWithMouse(page, "week");
  await fillTitleAndSaveEventForm(page, title);
  await expectSomedayEventVisible(page, title);

  const somedayEvent = page.locator("#sidebar").getByRole("button", {
    name: title,
  });
  const eventBox = await somedayEvent.boundingBox();

  if (!eventBox) {
    throw new Error("Expected the Someday event to be visible.");
  }

  const start = {
    x: eventBox.x + eventBox.width / 2,
    y: eventBox.y + eventBox.height / 2,
  };
  const target = await getMainGridPoint(page, { xRatio: 0.35, yRatio: 0.35 });

  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(target.x, target.y, { steps: 12 });

  const overlay = page.locator("[data-calendar-interaction-overlay]");
  const titleLabel = overlay.getByText(title);
  const timeLabel = overlay.locator("[data-someday-interaction-time-label]");

  await expect(overlay).toBeVisible();
  await expect(timeLabel).toHaveText(
    /\d{1,2}(?::\d{2})?\s+-\s+\d{1,2}(?::\d{2})?\s*(AM|PM)/i,
  );

  const titleBox = await titleLabel.boundingBox();
  const timeBox = await timeLabel.boundingBox();

  if (!titleBox || !timeBox) {
    throw new Error("Expected the Someday timed preview text to be visible.");
  }

  expect(timeBox.y).toBeGreaterThan(titleBox.y + titleBox.height - 2);
  expect(timeBox.x).toBeLessThan(titleBox.x + 8);

  await page.mouse.up();
});
