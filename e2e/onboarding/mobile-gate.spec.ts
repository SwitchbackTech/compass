import { expect, test } from "@playwright/test";

const IPHONE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";

test.use({
  userAgent: IPHONE_UA,
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  storageState: { cookies: [], origins: [] },
});

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "userAgentData", {
      configurable: true,
      value: { mobile: true },
    });
  });
});

test("phone users can copy the desktop link and join the waitlist", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/", { waitUntil: "domcontentloaded" });

  await expect(
    page.getByRole("heading", { name: "Open Compass on a computer" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Copy link for desktop" }).click();

  await expect(page.getByRole("button", { name: "Link copied" })).toBeVisible();
  await expect(page.locator("[data-pointer-hint]")).toHaveCount(0);

  const popupPromise = page.waitForEvent("popup");
  await page.getByRole("button", { name: "Join mobile waitlist" }).click();
  const popup = await popupPromise;
  expect(popup.url()).toContain("tylerdane.kit.com/compass-mobile");
  await expect(page.locator("[data-pointer-hint]")).toHaveCount(0);
  await popup.close();
});
