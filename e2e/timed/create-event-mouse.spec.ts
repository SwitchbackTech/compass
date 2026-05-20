import { expect, type Page, test } from "@playwright/test";
import {
  createEventTitle,
  ensureSidebarOpen,
  expectTimedEventVisible,
  fillTitleAndSaveEventForm,
  getMainGridPoint,
  openTimedEventFormWithMouse,
  prepareCalendarPage,
} from "../utils/event-test-utils";

interface StoredTimedEvent {
  endDate?: string;
  startDate?: string;
  title?: string;
}

const getSavedEventsByTitle = (page: Page, title: string) =>
  page.evaluate(async (eventTitle) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("compass-local");

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });

    try {
      return await new Promise<StoredTimedEvent[]>((resolve, reject) => {
        const transaction = db.transaction("events", "readonly");
        const request = transaction.objectStore("events").getAll();

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          resolve(
            request.result.filter(
              (event: StoredTimedEvent) => event.title === eventTitle,
            ),
          );
        };
      });
    } finally {
      db.close();
    }
  }, title);

const getTimedDraftEvent = (page: Page) =>
  page.locator('#timedEvents > [role="button"]:not([data-event-id])');

const getDurationMinutes = (event: StoredTimedEvent) => {
  if (!event.startDate || !event.endDate) {
    throw new Error("Expected saved event to have start and end dates.");
  }

  return (
    (new Date(event.endDate).getTime() - new Date(event.startDate).getTime()) /
    60_000
  );
};

const waitForSavedEventByTitle = async (page: Page, title: string) => {
  let savedEvent: StoredTimedEvent | null = null;

  await expect
    .poll(async () => {
      const savedEvents = await getSavedEventsByTitle(page, title);
      if (savedEvents.length === 1) {
        savedEvent = savedEvents[0]!;
      }

      return savedEvents.length;
    })
    .toBe(1);

  return savedEvent!;
};

test.skip(
  ({ isMobile }) => isMobile,
  "Mouse flows are desktop-only in week view.",
);

test("should create a timed event using mouse interaction", async ({
  page,
}) => {
  await prepareCalendarPage(page);

  const title = createEventTitle("Timed Event");
  await openTimedEventFormWithMouse(page);
  await fillTitleAndSaveEventForm(page, title);

  await expectTimedEventVisible(page, title);
});

test("opens a 15-minute timed event from a quick grid click", async ({
  page,
}) => {
  await prepareCalendarPage(page);

  const title = createEventTitle("Quick Click Timed Event");
  const { x, y } = await getMainGridPoint(page);

  await page.mouse.click(x, y);

  await page.mouse.move(x, y + 180);
  await fillTitleAndSaveEventForm(page, title);
  await expectTimedEventVisible(page, title);

  const savedEvent = await waitForSavedEventByTitle(page, title);

  expect(getDurationMinutes(savedEvent)).toBe(15);
  await expect(getTimedDraftEvent(page)).toHaveCount(0);
});

test("keeps drag-to-create duration when the pointer moves before release", async ({
  page,
}) => {
  await prepareCalendarPage(page);

  const title = createEventTitle("Dragged Timed Event");
  const { x, y } = await getMainGridPoint(page);

  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x, y + 160, { steps: 8 });
  await page.mouse.up();

  await fillTitleAndSaveEventForm(page, title);
  await expectTimedEventVisible(page, title);

  const savedEvent = await waitForSavedEventByTitle(page, title);

  expect(getDurationMinutes(savedEvent)).toBeGreaterThan(15);
  await expect(getTimedDraftEvent(page)).toHaveCount(0);
});

test("starts the timed draft in the day column under the pointer after horizontal scroll", async ({
  page,
}) => {
  await page.setViewportSize({ width: 900, height: 1000 });
  await prepareCalendarPage(page);
  await ensureSidebarOpen(page);
  await page.locator("#weekGridScroller").evaluate((node) => {
    node.scrollLeft = node.scrollWidth;
  });

  const targetDayLabel = page.locator("#weekGridScroller [title]").nth(6);
  const mainGrid = page.locator("#mainGrid");
  const targetBox = await targetDayLabel.boundingBox();
  const gridBox = await mainGrid.boundingBox();

  if (!targetBox || !gridBox) {
    throw new Error(
      "Expected the week grid and target day label to be visible.",
    );
  }

  const x = targetBox.x + targetBox.width / 2;
  const y = gridBox.y + gridBox.height * 0.4;

  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x, y + 80);

  const draftEvent = getTimedDraftEvent(page);
  await expect(draftEvent).toBeVisible();

  const draftBox = await draftEvent.boundingBox();
  if (!draftBox) {
    throw new Error("Expected the timed draft to be visible.");
  }

  const draftCenterX = draftBox.x + draftBox.width / 2;
  expect(draftCenterX).toBeGreaterThanOrEqual(targetBox.x);
  expect(draftCenterX).toBeLessThanOrEqual(targetBox.x + targetBox.width);

  await page.mouse.up();
});
