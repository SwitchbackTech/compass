import { expect, test } from "@playwright/test";
import {
  buildBookableSlot,
  formatSlotButtonLabel,
  preparePublicBookingPage,
} from "./booking-harness";

test.describe("public booking page", () => {
  test("loads without login and shows the host heading", async ({ page }) => {
    await preparePublicBookingPage(page);

    await expect(page.getByText(/Times shown in your timezone/)).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Pick a time" }),
    ).toBeVisible();
  });

  test("confirms a booking against stubbed APIs", async ({ page }) => {
    const { slotStart } = buildBookableSlot();
    const captured = await preparePublicBookingPage(page);

    await page
      .getByRole("button", { name: formatSlotButtonLabel(slotStart) })
      .click();
    await page.getByLabel("Name").fill("Guest User");
    await page.getByLabel("Email").fill("guest@example.com");
    await page.getByRole("button", { name: "Confirm booking" }).click();

    await expect(
      page.getByRole("heading", { name: "You are booked with Tyler Dane" }),
    ).toBeVisible();
    expect(captured.reservationPosts).toHaveLength(1);
    expect(captured.reservationPosts[0]).toMatchObject({
      slotStart,
      guestName: "Guest User",
      guestEmail: "guest@example.com",
    });
  });

  test("does not POST when email is missing", async ({ page }) => {
    const { slotStart } = buildBookableSlot();
    const captured = await preparePublicBookingPage(page);

    await page
      .getByRole("button", { name: formatSlotButtonLabel(slotStart) })
      .click();
    await page.getByLabel("Name").fill("Guest User");
    await page.getByRole("button", { name: "Confirm booking" }).click();

    expect(captured.reservationPosts).toHaveLength(0);
    await expect(page.getByLabel("Email")).toBeFocused();
  });

  test("scrolls when available times overflow the viewport", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 800, height: 480 });

    const origin = new Date();
    origin.setUTCDate(origin.getUTCDate() + 2);
    origin.setUTCHours(8, 0, 0, 0);
    const slots = Array.from({ length: 60 }, (_, index) => {
      const slotStart = new Date(origin.getTime() + index * 15 * 60 * 1000);
      return {
        slotStart: slotStart.toISOString(),
        slotEnd: new Date(slotStart.getTime() + 30 * 60 * 1000).toISOString(),
      };
    });

    await preparePublicBookingPage(page, { slots });

    await expect
      .poll(async () =>
        page.evaluate(() => {
          const scrolling = document.scrollingElement;
          if (!scrolling) {
            return false;
          }
          const overflowY = getComputedStyle(
            document.documentElement,
          ).overflowY;
          return (
            (overflowY === "auto" || overflowY === "scroll") &&
            scrolling.scrollHeight > scrolling.clientHeight + 40
          );
        }),
      )
      .toBe(true);

    await page.evaluate(() => window.scrollTo(0, 0));
    await page.mouse.move(400, 200);
    await page.mouse.wheel(0, 1600);
    await expect
      .poll(async () => page.evaluate(() => window.scrollY))
      .toBeGreaterThan(80);

    await page.evaluate(() => window.scrollTo(0, 0));
    await page.locator("body").click({ position: { x: 16, y: 16 } });
    await page.keyboard.press("PageDown");
    await expect
      .poll(async () => page.evaluate(() => window.scrollY))
      .toBeGreaterThan(80);
  });

  test("refreshes slots and shows a conflict message on 409", async ({
    page,
  }) => {
    const first = buildBookableSlot();
    const secondStart = new Date(
      Date.parse(first.slotStart) + 30 * 60 * 1000,
    ).toISOString();
    const second = {
      slotStart: secondStart,
      slotEnd: new Date(Date.parse(secondStart) + 30 * 60 * 1000).toISOString(),
    };
    const captured = await preparePublicBookingPage(page, {
      confirmStatus: 409,
      slots: [first, second],
    });

    await page
      .getByRole("button", { name: formatSlotButtonLabel(first.slotStart) })
      .click();
    await page.getByLabel("Name").fill("Guest User");
    await page.getByLabel("Email").fill("guest@example.com");
    await page.getByLabel("Notes (optional)").fill("Bring slides");
    await page.getByRole("button", { name: "Confirm booking" }).click();

    const alert = page.getByRole("alert");
    await expect(alert).toHaveText(
      "This time is no longer available. Pick another slot.",
    );
    await expect(alert).toBeFocused();
    await expect(page.getByLabel("Name")).toHaveValue("Guest User");
    await expect(page.getByLabel("Email")).toHaveValue("guest@example.com");
    await expect(page.getByLabel("Notes (optional)")).toHaveValue(
      "Bring slides",
    );
    await expect(
      page.getByRole("button", { name: "Confirm booking" }),
    ).toBeDisabled();
    await expect.poll(() => captured.slotGets).toBeGreaterThan(1);

    await page
      .getByRole("button", { name: formatSlotButtonLabel(second.slotStart) })
      .click();
    await expect(
      page.getByRole("button", { name: "Confirm booking" }),
    ).toBeEnabled();
  });
});
