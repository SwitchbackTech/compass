import { expect, test } from "@playwright/test";
import {
  ensureSidebarOpen,
  prepareCalendarPage,
} from "../utils/event-test-utils";

const pressModAlt = async (
  page: import("@playwright/test").Page,
  key: string,
) => {
  const useMeta = await page.evaluate(
    () => /mac/i.test(navigator.platform) || /mac/i.test(navigator.userAgent),
  );
  if (useMeta) {
    await page.keyboard.down("Meta");
    await page.keyboard.down("Alt");
    await page.keyboard.press(key);
    await page.keyboard.up("Alt");
    await page.keyboard.up("Meta");
    return;
  }
  await page.keyboard.down("Control");
  await page.keyboard.down("Alt");
  await page.keyboard.press(key);
  await page.keyboard.up("Alt");
  await page.keyboard.up("Control");
};

test.describe("sidebar month picker shortcuts", () => {
  test("Mod+Alt+T returns to the current month after browsing", async ({
    page,
  }) => {
    await prepareCalendarPage(page);
    await ensureSidebarOpen(page);

    const monthPicker = page
      .locator("#sidebar")
      .getByRole("group", { name: "Date navigation" });
    await expect(monthPicker).toBeVisible();

    const currentMonthLabel = await page.evaluate(() => {
      const now = new Date();
      return now.toLocaleString("en-US", { month: "short", year: "numeric" });
    });

    await pressModAlt(page, "k");
    await pressModAlt(page, "k");
    await expect(monthPicker).not.toContainText(currentMonthLabel);

    await pressModAlt(page, "t");
    await expect(monthPicker).toContainText(currentMonthLabel);
  });

  test("plain t also returns the picker to the current month", async ({
    page,
  }) => {
    await prepareCalendarPage(page);
    await ensureSidebarOpen(page);

    const monthPicker = page
      .locator("#sidebar")
      .getByRole("group", { name: "Date navigation" });
    await expect(monthPicker).toBeVisible();

    const currentMonthLabel = await page.evaluate(() => {
      const now = new Date();
      return now.toLocaleString("en-US", { month: "short", year: "numeric" });
    });

    await pressModAlt(page, "k");
    await pressModAlt(page, "k");
    await expect(monthPicker).not.toContainText(currentMonthLabel);

    await page.keyboard.press("t");
    await expect(monthPicker).toContainText(currentMonthLabel);
  });
});
