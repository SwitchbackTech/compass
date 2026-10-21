import { expect, test } from "@playwright/test";
import { prepareCalendarPage } from "../utils/event-test-utils";
import { evaluateWeekGridEventAlignment } from "../utils/week-grid-alignment.util";

const DENVER = "America/Denver";
const WEEK_START = "2026-11-01";
const FROZEN_CLOCK = "2026-10-20T12:00:00-06:00";
const PROBE_TITLE = "Alignment probe";

async function seedAlignmentProbe(page: import("@playwright/test").Page) {
  await expect
    .poll(() =>
      page.evaluate(() => localStorage.getItem("compass.localCalendarId")),
    )
    .not.toBeNull();

  await page.evaluate(
    async ({ endUtc, startUtc, timeZone, title }) => {
      const calendarId = localStorage.getItem("compass.localCalendarId");
      if (!calendarId) {
        throw new Error("missing local calendar id");
      }
      const id = `05${"a".repeat(22)}`;
      const record = {
        version: 2,
        id,
        isDemo: false,
        event: {
          id,
          calendarId,
          content: { kind: "details", title, description: "" },
          schedule: {
            kind: "timed",
            start: startUtc,
            end: endUtc,
            timeZone,
          },
          recurrence: { kind: "single" },
          createdAt: "2026-11-01T00:00:00.000Z",
          updatedAt: null,
        },
      };
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open("compass-local");
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
      });
      try {
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction("events", "readwrite");
          tx.objectStore("events").put(record);
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });
      } finally {
        db.close();
      }
    },
    {
      endUtc: "2026-11-05T17:45:00.000Z",
      startUtc: "2026-11-05T17:00:00.000Z",
      timeZone: DENVER,
      title: PROBE_TITLE,
    },
  );
}

async function openAlignmentWeek(page: import("@playwright/test").Page) {
  await page.addInitScript(() => {
    localStorage.setItem("compass.onboarding.has-seen-welcome", "true");
    localStorage.setItem("compass.onboarding.first-event-done", "dismissed");
    localStorage.setItem("compass.onboarding.has-seen-life-view-intro", "true");
    localStorage.setItem("compass.view.sidebar-open", "false");
  });
  await page.clock.install({ time: new Date(FROZEN_CLOCK) });
  await prepareCalendarPage(page);
  await page.goto(`/week/${WEEK_START}`, { waitUntil: "domcontentloaded" });
  await page.locator("#mainGrid").waitFor({ state: "visible" });
  await seedAlignmentProbe(page);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.locator("#mainGrid").waitFor({ state: "visible" });
  await expect(
    page.locator("#timedEvents").getByRole("button", { name: PROBE_TITLE }),
  ).toBeVisible({ timeout: 15_000 });
}

test.describe("Week grid event alignment", () => {
  test.use({
    timezoneId: DENVER,
    viewport: { width: 1280, height: 900 },
  });

  test("lines timed events up with gutter hour rows and day columns", async ({
    page,
  }) => {
    await openAlignmentWeek(page);

    const alignment = await evaluateWeekGridEventAlignment(
      page,
      /Alignment probe/i,
      "10 AM",
    );
    expect(alignment.ok, JSON.stringify(alignment)).toBe(true);
  });

  test("stays aligned after life view then week with blog utm params", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      localStorage.setItem("compass.onboarding.has-seen-welcome", "true");
      localStorage.setItem("compass.onboarding.first-event-done", "dismissed");
      localStorage.setItem(
        "compass.onboarding.has-seen-life-view-intro",
        "true",
      );
      localStorage.setItem("compass.view.sidebar-open", "false");
    });
    await page.clock.install({ time: new Date(FROZEN_CLOCK) });
    await page.goto("/life", { waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("heading", { name: "Life", exact: true }),
    ).toBeVisible();

    await page.goto(
      "/week?utm_source=blog&utm_medium=cta&utm_campaign=try_app&utm_content=star_button",
      { waitUntil: "domcontentloaded" },
    );
    await page.locator("#mainGrid").waitFor({ state: "visible" });
    await page.goto(`/week/${WEEK_START}`, { waitUntil: "domcontentloaded" });
    await seedAlignmentProbe(page);
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.locator("#mainGrid").waitFor({ state: "visible" });
    await expect(
      page.locator("#timedEvents").getByRole("button", { name: PROBE_TITLE }),
    ).toBeVisible({ timeout: 15_000 });

    await expect
      .poll(() =>
        evaluateWeekGridEventAlignment(page, /Alignment probe/i, "10 AM"),
      )
      .toMatchObject({ ok: true });
  });
});
