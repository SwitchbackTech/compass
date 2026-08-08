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
  { xRatio }: { xRatio: number },
) => {
  const { x, y } = await getMainGridPoint(page, { xRatio, yRatio: 0.35 });
  await page.mouse.click(x, y);
  await fillTitleAndSaveEventForm(page, title);
  await expectTimedEventVisible(page, title);
};

test("ArrowRight moves focus to the nearest event on the next non-empty day", async ({
  page,
}) => {
  await prepareCalendarPage(page);

  const mondayTitle = createEventTitle("Monday Focus");
  const wednesdayTitle = createEventTitle("Wednesday Focus");

  // Leftmost columns are earlier weekdays; ratios stay inside timed columns.
  await createTimedEventAt(page, mondayTitle, { xRatio: 0.12 });
  await createTimedEventAt(page, wednesdayTitle, { xRatio: 0.42 });

  const mondayButton = page
    .locator("#mainGrid")
    .getByRole("button", { name: mondayTitle });
  const wednesdayButton = page
    .locator("#mainGrid")
    .getByRole("button", { name: wednesdayTitle });

  await mondayButton.focus();
  await expect(mondayButton).toBeFocused();

  await page.keyboard.press("ArrowRight");

  await expect(wednesdayButton).toBeFocused();
});
