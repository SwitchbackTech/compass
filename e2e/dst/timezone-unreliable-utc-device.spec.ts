import { expect, test } from "@playwright/test";
import { prepareCalendarPage } from "../utils/event-test-utils";

const DENVER = "America/Denver";
const WEEK_START = "2026-10-18";

test.describe("Unreliable UTC device zone", () => {
  test.use({
    timezoneId: DENVER,
    viewport: { width: 1280, height: 900 },
  });

  test("keeps Denver grid and hides mismatch banner when Intl reports UTC", async ({
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
      localStorage.setItem("compass.timezone.default", "America/Denver");
      const original = Intl.DateTimeFormat.prototype.resolvedOptions;
      Intl.DateTimeFormat.prototype.resolvedOptions = function (
        this: Intl.DateTimeFormat,
      ) {
        const options = original.call(this);
        return { ...options, timeZone: "UTC" };
      };
    });
    await page.clock.install({ time: new Date("2026-10-21T12:25:00-06:00") });
    await prepareCalendarPage(page);
    await page.goto(`/week/${WEEK_START}`, { waitUntil: "domcontentloaded" });
    await page.locator("#mainGrid").waitFor({ state: "visible" });

    await expect(
      page.getByRole("button", { name: /Calendar timezone:/ }),
    ).toHaveText(/MDT|MST/);
    await expect(
      page.getByRole("region", { name: "Timezone mismatch" }),
    ).toHaveCount(0);
  });
});
