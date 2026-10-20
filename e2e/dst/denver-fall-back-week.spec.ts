import { expect, test } from "@playwright/test";
import {
  getVisibleDayDates,
  prepareCalendarPage,
} from "../utils/event-test-utils";

const DENVER = "America/Denver";
const WEEK_START = "2026-11-01";

async function seedDenverWakeWeek(page: import("@playwright/test").Page) {
  await expect
    .poll(() =>
      page.evaluate(() => localStorage.getItem("compass.localCalendarId")),
    )
    .not.toBeNull();

  await page.evaluate(async () => {
    const calendarId = localStorage.getItem("compass.localCalendarId");
    if (!calendarId) {
      throw new Error("missing local calendar id");
    }

    const records = Array.from({ length: 7 }, (_, index) => {
      const day = index + 1;
      const dayKey = `2026-11-${String(day).padStart(2, "0")}`;
      const id = `${String(day).padStart(2, "0")}${"b".repeat(22)}`;
      return {
        version: 2,
        id,
        isDemo: false,
        event: {
          id,
          calendarId,
          content: { kind: "details", title: "~ Wake", description: "" },
          schedule: {
            kind: "timed",
            start: `${dayKey}T11:00:00.000Z`,
            end: `${dayKey}T12:00:00.000Z`,
            timeZone: "America/Denver",
          },
          recurrence: { kind: "single" },
          createdAt: "2026-11-01T00:00:00.000Z",
          updatedAt: null,
        },
      };
    });

    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("compass-local");
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction("events", "readwrite");
        const store = tx.objectStore("events");
        for (const record of records) {
          store.put(record);
        }
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } finally {
      db.close();
    }
  });
}

test.describe("Denver browser fall-back week", () => {
  test.use({
    timezoneId: DENVER,
    viewport: { width: 1600, height: 900 },
  });

  test("renders the Nov 2026 fall-back week with 25 hour slots", async ({
    page,
  }, testInfo) => {
    testInfo.setTimeout(60_000);
    await page.addInitScript(() => {
      localStorage.setItem("compass.onboarding.has-seen-welcome", "true");
      localStorage.setItem("compass.onboarding.first-event-done", "dismissed");
    });
    await page.clock.install({ time: new Date("2026-11-03T09:00:00-07:00") });
    await prepareCalendarPage(page);
    await page.goto(`/week/${WEEK_START}`, { waitUntil: "domcontentloaded" });
    await page.locator("#mainGrid").waitFor({ state: "visible" });

    await expect.poll(() => getVisibleDayDates(page)).toContain(WEEK_START);

    await seedDenverWakeWeek(page);
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.locator("#mainGrid").waitFor({ state: "visible" });

    const wakeButtons = page
      .locator("#timedEvents")
      .getByRole("button", { name: /Wake/i });
    await expect(wakeButtons).toHaveCount(7);

    const alignment = await page.evaluate(() => {
      const grid = document.querySelector("#mainGrid");
      if (!grid) {
        return { ok: false, reason: "missing grid" };
      }
      const tolerance = 4;
      const rows = [
        ...grid.querySelectorAll<HTMLElement>(
          '[data-calendar-timed-grid-row="true"]',
        ),
      ];
      const fourAmRow = rows[3];
      if (!fourAmRow) {
        return { ok: false, reason: "missing 4 AM grid row" };
      }
      const rowTop = fourAmRow.getBoundingClientRect().top;
      const layers = document.querySelector("#timedEvents");
      if (!layers) {
        return { ok: false, reason: "missing timedEvents" };
      }
      const cards = [
        ...layers.querySelectorAll<HTMLElement>("[style*='top']"),
      ].filter((node) => /wake/i.test(node.textContent ?? ""));
      if (cards.length !== 7) {
        return { ok: false, reason: `expected 7 cards, got ${cards.length}` };
      }
      const cardDeltas = cards.map(
        (node) => node.getBoundingClientRect().top - rowTop,
      );
      const misaligned = cardDeltas.filter(
        (delta) => Math.abs(delta) > tolerance,
      );
      return {
        ok: misaligned.length === 0,
        cardDeltas,
      };
    });
    expect(alignment.ok, JSON.stringify(alignment)).toBe(true);

    await page.locator("#mainGrid").evaluate((grid) => {
      const fourAmLabel = [...document.querySelectorAll("span")].find(
        (node) =>
          node.textContent?.trim() === "4 AM" &&
          node.classList.contains("text-[10px]"),
      );
      if (fourAmLabel) {
        const labelTop =
          fourAmLabel.getBoundingClientRect().top -
          grid.getBoundingClientRect().top +
          grid.scrollTop;
        grid.scrollTop = Math.max(0, labelTop - grid.clientHeight * 0.12);
      }
    });

    await page.locator("#mainGrid").screenshot({
      path: "/opt/cursor/artifacts/dst-nov-week.png",
    });

    const slots = await page
      .locator("#mainGrid")
      .evaluate((grid) =>
        getComputedStyle(grid)
          .getPropertyValue("--calendar-day-hour-slots")
          .trim(),
      );
    expect(slots).toBe("25");
    await expect(
      page.getByRole("button", { name: "Calendar timezone" }),
    ).toContainText("MST");
  });
});
