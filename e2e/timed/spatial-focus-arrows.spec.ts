import { expect, test } from "@playwright/test";
import {
  createEventTitle,
  expectTimedEventVisible,
  fillTitleAndSaveEventForm,
  getSavedEventsByTitle,
  getVisibleDayDates,
  openTimedEventFormWithKeyboard,
  prepareCalendarPage,
} from "../utils/event-test-utils";

const createTimedEvent = async (
  page: Parameters<typeof prepareCalendarPage>[0],
  title: string,
) => {
  await openTimedEventFormWithKeyboard(page);
  await fillTitleAndSaveEventForm(page, title);
  await expectTimedEventVisible(page, title);
};

test("ArrowRight moves focus to the nearest event on the next non-empty day", async ({
  page,
}) => {
  await prepareCalendarPage(page);

  const firstTitle = createEventTitle("Anchor Focus");
  const movedTitle = createEventTitle("Neighbor Focus");

  // Both events land on today via the c shortcut; nudge the second onto an
  // adjacent day, away from the week edge so the move never carries the view.
  await createTimedEvent(page, firstTitle);
  await createTimedEvent(page, movedTitle);

  const [saved] = await getSavedEventsByTitle(page, movedTitle);
  const days = await getVisibleDayDates(page);
  const todayIndex = days.indexOf(saved.startDate.slice(0, 10));
  const moveRight = todayIndex < days.length - 1;

  const movedButton = page
    .locator("#mainGrid")
    .getByRole("button", { name: movedTitle });
  await movedButton.focus();
  await page.keyboard.press(moveRight ? "Shift+ArrowRight" : "Shift+ArrowLeft");
  await expect
    .poll(async () => {
      const [event] = await getSavedEventsByTitle(page, movedTitle);
      return event?.startDate.slice(0, 10);
    })
    .toBe(days[moveRight ? todayIndex + 1 : todayIndex - 1]);

  // Focus the event on the earlier day and ArrowRight to its neighbor.
  const leftTitle = moveRight ? firstTitle : movedTitle;
  const rightTitle = moveRight ? movedTitle : firstTitle;
  const leftButton = page
    .locator("#mainGrid")
    .getByRole("button", { name: leftTitle });
  const rightButton = page
    .locator("#mainGrid")
    .getByRole("button", { name: rightTitle });

  await leftButton.focus();
  await expect(leftButton).toBeFocused();

  await page.keyboard.press("ArrowRight");

  await expect(rightButton).toBeFocused();
});
