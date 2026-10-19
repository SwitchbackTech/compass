import { type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/** Matches `AppDelegate` default content size on macOS. */
export const PARITY_VIEWPORT = { width: 1280, height: 820 } as const;

const DEMO_SEED_PATH = join(
  process.cwd(),
  "apps/calendar-macos/CompassKit/Sources/CompassKit/Resources/Fixtures/demo-seed.json",
);

type DemoSeedFixture = {
  referenceNow: string;
  calendarId: string;
  events: unknown[];
};

const demoFixture = JSON.parse(
  readFileSync(DEMO_SEED_PATH, "utf8"),
) as DemoSeedFixture;

type ParityWebOptions = {
  /** When false, leave welcome modal eligible (onboarding capture). */
  dismissOnboarding?: boolean;
};

export async function installParityWebEnvironment(
  page: Page,
  options: ParityWebOptions = {},
) {
  const dismissOnboarding = options.dismissOnboarding ?? true;
  const localStorageSeed: Record<string, string> = {
    "compass.theme": "light-beach",
    "compass.migration.demo-data-seed-v2": "done",
    "compass.localCalendarId": demoFixture.calendarId,
  };
  if (dismissOnboarding) {
    localStorageSeed["compass.onboarding.has-seen-welcome"] = "true";
    localStorageSeed["compass.onboarding.first-event-done"] = "dismissed";
  }
  await page.clock.install({ time: new Date(demoFixture.referenceNow) });
  await page.addInitScript((flags) => {
    for (const [key, value] of Object.entries(flags)) {
      localStorage.setItem(key, value);
    }
  }, localStorageSeed);
}

/** Load demo-seed.json into IndexedDB after the app has opened compass-local. */
export async function prepareParityDemoWeek(page: Page) {
  await page.goto("/week", { waitUntil: "domcontentloaded" });
  await page.locator("#timedColumns").waitFor({ timeout: 20_000 });
  await seedParityDemoEvents(page);
  await page.reload({ waitUntil: "domcontentloaded" });
  await expectDemoGrid(page);
}

export async function expectDemoGrid(page: Page) {
  await page.locator("#timedColumns").waitFor({ timeout: 20_000 });
  await page
    .getByRole("button", { name: /Try Compass|Morning standup/i })
    .first()
    .waitFor({ timeout: 20_000 });
}

async function seedParityDemoEvents(page: Page) {
  await page.evaluate(async (records) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("compass-local");
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction("events", "readwrite");
        const store = tx.objectStore("events");
        store.clear();
        for (const record of records) {
          store.put(record);
        }
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } finally {
      db.close();
    }
  }, demoFixture.events);
}
