import { expect, test } from "@playwright/test";
import {
  createEventTitle,
  expectTimedEventVisible,
  fillTitleAndSaveEventForm,
  getMainGridPoint,
  prepareCalendarPage,
} from "../utils/event-test-utils";

const createTimedEventAt = async (
  page: Parameters<typeof prepareCalendarPage>[0],
  title: string,
  { xRatio, yRatio }: { xRatio: number; yRatio: number },
) => {
  const { x, y } = await getMainGridPoint(page, { xRatio, yRatio });
  await page.mouse.click(x, y);
  await fillTitleAndSaveEventForm(page, title);
  await expectTimedEventVisible(page, title);
};

const shiftHintOverlay = (page: Parameters<typeof prepareCalendarPage>[0]) =>
  page.locator("[data-shift-event-hints]");

const tapShift = async (page: Parameters<typeof prepareCalendarPage>[0]) => {
  await page.keyboard.down("Shift");
  await page.keyboard.up("Shift");
};

test("tap Shift shows day-prefix jump keys and focuses the assigned event", async ({
  page,
}) => {
  await prepareCalendarPage(page);

  const earlyTitle = createEventTitle("Early Flash");
  const middleTitle = createEventTitle("Middle Flash");
  const lateTitle = createEventTitle("Late Flash");

  // Wednesday column at xRatio 0.42; earlier y ≈ earlier start for indices.
  await createTimedEventAt(page, earlyTitle, { xRatio: 0.42, yRatio: 0.25 });
  await createTimedEventAt(page, middleTitle, { xRatio: 0.42, yRatio: 0.4 });
  await createTimedEventAt(page, lateTitle, { xRatio: 0.42, yRatio: 0.55 });

  const middleButton = page
    .locator("#mainGrid")
    .getByRole("button", { name: middleTitle });

  await tapShift(page);

  const overlay = shiftHintOverlay(page);
  await expect(overlay.getByText("W1", { exact: true })).toHaveCount(1);
  await expect(overlay.getByText("W2", { exact: true })).toHaveCount(1);
  await expect(overlay.getByText("W3", { exact: true })).toHaveCount(1);

  await page.keyboard.down("w");
  await page.keyboard.up("w");
  await page.keyboard.down("2");
  await page.keyboard.up("2");

  await expect(middleButton).toBeFocused();
  // Mode stays on after a digit focus so another index can be typed.
  await expect(shiftHintOverlay(page)).toHaveCount(1);

  await page.keyboard.down("Escape");
  await page.keyboard.up("Escape");
  await expect(shiftHintOverlay(page)).toHaveCount(0);
});

test("fast Shift+J does not toggle event jump keys", async ({ page }) => {
  await prepareCalendarPage(page);

  const title = createEventTitle("Chord Quiet");
  await createTimedEventAt(page, title, { xRatio: 0.42, yRatio: 0.35 });

  await page.keyboard.down("Shift");
  await page.keyboard.down("j");
  await page.waitForTimeout(250);
  await page.keyboard.up("j");
  await page.keyboard.up("Shift");

  await expect(shiftHintOverlay(page)).toHaveCount(0);
});
