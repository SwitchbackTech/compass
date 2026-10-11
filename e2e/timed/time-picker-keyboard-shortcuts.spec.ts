import { expect, test } from "@playwright/test";
import {
  createEventTitle,
  expectTimedEventVisible,
  getEventFormTitleInput,
  getSavedEventsByTitle,
  installDeterministicBrowserClock,
  openTimedEventFormWithKeyboard,
  prepareCalendarPage,
  pressEscapeOnFocusedElement,
  pressModEnterOnFocusedElement,
} from "../utils/event-test-utils";

test.beforeEach(async ({ page }) => {
  await installDeterministicBrowserClock(page);
  await prepareCalendarPage(page);
});

test("Mod+Enter from the start time picker commits a typed time and saves", async ({
  page,
}) => {
  const title = createEventTitle("Time picker Mod save");
  await openTimedEventFormWithKeyboard(page);
  await getEventFormTitleInput(page).fill(title);

  const start = page.getByRole("combobox", { name: "Start time" });
  await start.click();
  await start.pressSequentially("12:45");

  await pressModEnterOnFocusedElement(page);

  await getEventFormTitleInput(page).waitFor({ state: "hidden" });
  await expectTimedEventVisible(page, title);

  const [saved] = await getSavedEventsByTitle(page, title);
  expect(saved?.startDate).toMatch(/T00:45:00/);
});

test("Mod+Enter from the end time picker commits a typed time and saves", async ({
  page,
}) => {
  const title = createEventTitle("End picker Mod save");
  await openTimedEventFormWithKeyboard(page);
  await getEventFormTitleInput(page).fill(title);

  const end = page.getByRole("combobox", { name: "End time" });
  await end.click();
  await end.pressSequentially("1145");

  await pressModEnterOnFocusedElement(page);

  await getEventFormTitleInput(page).waitFor({ state: "hidden" });
  await expectTimedEventVisible(page, title);

  const [saved] = await getSavedEventsByTitle(page, title);
  expect(saved?.endDate).toMatch(/T11:45:00/);
});

test("Escape closes the start time menu before dismissing the form", async ({
  page,
}) => {
  await openTimedEventFormWithKeyboard(page);
  const titleInput = getEventFormTitleInput(page);

  const start = page.getByRole("combobox", { name: "Start time" });
  await start.click();
  await start.pressSequentially("2");
  await expect(page.getByRole("listbox")).toBeVisible();

  await pressEscapeOnFocusedElement(page);
  await expect(page.getByRole("listbox")).toHaveCount(0);
  await expect(titleInput).toBeVisible();

  await pressEscapeOnFocusedElement(page);
  await titleInput.waitFor({ state: "hidden" });
});

test("Escape closes the end time menu before dismissing the form", async ({
  page,
}) => {
  await openTimedEventFormWithKeyboard(page);
  const titleInput = getEventFormTitleInput(page);

  const end = page.getByRole("combobox", { name: "End time" });
  await end.click();
  await end.pressSequentially("3");
  await expect(page.getByRole("listbox")).toBeVisible();

  await pressEscapeOnFocusedElement(page);
  await expect(page.getByRole("listbox")).toHaveCount(0);
  await expect(titleInput).toBeVisible();

  await pressEscapeOnFocusedElement(page);
  await titleInput.waitFor({ state: "hidden" });
});
