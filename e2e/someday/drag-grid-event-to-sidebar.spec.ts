import { expect, type Page, test } from "@playwright/test";
import {
  createEventTitle,
  ensureSidebarOpen,
  expectSomedayEventVisible,
  fillTitleAndSaveEventForm,
  openSomedayEventFormWithMouse,
  prepareCalendarPage,
} from "../utils/event-test-utils";

test.skip(
  ({ isMobile }) => isMobile,
  "Mouse flows are desktop-only in week view.",
);

const sidebarButton = (page: Page, name: string) =>
  page.locator("#sidebar").getByRole("button", { name });

const centerOf = async (
  page: Page,
  name: string,
  scope: "sidebar" | "grid",
) => {
  const locator =
    scope === "sidebar"
      ? sidebarButton(page, name)
      : page.locator("#mainGrid").getByRole("button", { name });
  const box = await locator.boundingBox();

  if (!box) {
    throw new Error(`Expected ${scope} element "${name}" to have a box.`);
  }

  return { x: box.x + box.width / 2, y: box.y + box.height / 2, box };
};

const createSomeday = async (
  page: Page,
  section: "week" | "month",
  prefix: string,
) => {
  const title = createEventTitle(prefix);
  await openSomedayEventFormWithMouse(page, section);
  await fillTitleAndSaveEventForm(page, title);
  await expectSomedayEventVisible(page, title);
  return title;
};

// Creates a TALL timed event via vertical drag-select and waits for its
// optimistic/pending state to settle, so it can be reliably grabbed for a drag
// (a short, freshly-created event lands on the resize handle / refuses to drag).
const createTimed = async (page: Page, prefix: string) => {
  const title = createEventTitle(prefix);
  const grid = await page.locator("#mainGrid").boundingBox();

  if (!grid) throw new Error("Expected the week grid to be visible.");

  const gx = grid.x + grid.width * 0.4;
  const gy = grid.y + grid.height * 0.25;

  await page.mouse.move(gx, gy);
  await page.mouse.down();
  await page.mouse.move(gx, gy + 160, { steps: 12 });
  await page.mouse.up();
  await fillTitleAndSaveEventForm(page, title);

  await expect(
    page.locator("#mainGrid").getByRole("button", { name: title }),
  ).toBeVisible({ timeout: 8000 });
  await page.waitForTimeout(2500);

  return title;
};

test("drags a timed grid event into the Someday week list and reorders rows live", async ({
  page,
}) => {
  await prepareCalendarPage(page);
  await ensureSidebarOpen(page);

  const weekA = await createSomeday(page, "week", "Week A");
  const weekB = await createSomeday(page, "week", "Week B");
  const timed = await createTimed(page, "Timed T");

  const start = await centerOf(page, timed, "grid");
  const a = await centerOf(page, weekA, "sidebar");
  const b = await centerOf(page, weekB, "sidebar");

  // Aim for the seam between A and B in the week list.
  const target = { x: a.x, y: (a.y + b.y) / 2 };

  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(target.x, target.y, { steps: 16 });
  await page.waitForTimeout(250);

  await page.screenshot({
    path: "test-results/repro/week-list-mid-drag.png",
  });

  // The dragged event should appear in the sidebar between A and B (the existing
  // rows opened a gap). The dragged row drops its `button` role, so match text.
  const placeholder = page
    .locator("#sidebar")
    .getByText(timed, { exact: false });
  await expect(placeholder).toBeVisible();

  const placeholderBox = await placeholder.boundingBox();
  const aBox = await sidebarButton(page, weekA).boundingBox();
  const bBox = await sidebarButton(page, weekB).boundingBox();

  await page.mouse.up();

  expect(placeholderBox).not.toBeNull();
  expect(aBox).not.toBeNull();
  expect(bBox).not.toBeNull();

  if (placeholderBox && aBox && bBox) {
    const placeholderMid = placeholderBox.y + placeholderBox.height / 2;
    const aMid = aBox.y + aBox.height / 2;
    const bMid = bBox.y + bBox.height / 2;

    expect(aMid).toBeLessThan(placeholderMid);
    expect(placeholderMid).toBeLessThan(bMid);
  }
});

test("snaps to the nearest Someday list when dropped between the lists", async ({
  page,
}) => {
  await prepareCalendarPage(page);
  await ensureSidebarOpen(page);

  const weekA = await createSomeday(page, "week", "Week A");
  const monthM = await createSomeday(page, "month", "Month M");
  const timed = await createTimed(page, "Timed T");

  const start = await centerOf(page, timed, "grid");
  const a = await centerOf(page, weekA, "sidebar");
  const m = await centerOf(page, monthM, "sidebar");

  // A point in the empty space between the week list (above) and the month
  // list (below), biased toward the month list so "nearest" should be Month.
  const gapTarget = { x: a.x, y: m.box.y - 8 };

  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(gapTarget.x, gapTarget.y, { steps: 16 });
  await page.waitForTimeout(250);

  await page.screenshot({
    path: "test-results/repro/between-lists-mid-drag.png",
  });

  await page.mouse.up();
  await page.waitForTimeout(400);

  await page.screenshot({
    path: "test-results/repro/between-lists-after-drop.png",
  });

  // It should have converted to a Someday event (nearest = Month), not jumped
  // back onto the grid.
  await expect(
    page.locator("#mainGrid").getByRole("button", { name: timed }),
  ).toHaveCount(0, { timeout: 8000 });
  await expect(sidebarButton(page, timed)).toBeVisible({ timeout: 8000 });
});
