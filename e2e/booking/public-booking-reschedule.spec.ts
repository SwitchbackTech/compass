import { expect, type Page, test } from "@playwright/test";
import {
  buildBookableSlot,
  buildSameDaySiblingSlot,
  formatSlotButtonLabel,
  formatSlotWhenLabel,
  preparePublicBookingPage,
  preparePublicBookingReschedulePage,
} from "./booking-harness";

async function guestTimeZone(page: Page): Promise<string> {
  return page.evaluate(() => Intl.DateTimeFormat().resolvedOptions().timeZone);
}

test.describe("public booking reschedule", () => {
  test("confirm then reschedule to a new slot shows the new time", async ({
    page,
  }) => {
    const first = buildBookableSlot();
    const second = buildSameDaySiblingSlot(first);
    const captured = await preparePublicBookingPage(page, {
      slots: [first, second],
    });
    const timeZone = await guestTimeZone(page);

    await page
      .getByRole("button", { name: formatSlotButtonLabel(first.slotStart) })
      .click();
    await page.getByLabel("Name").fill("Guest User");
    await page.getByLabel("Email").fill("guest@example.com");
    await page.getByRole("button", { name: "Confirm booking" }).click();

    await expect(
      page.getByRole("heading", { name: "You are booked with Tyler Dane" }),
    ).toBeFocused();
    await expect(
      page.getByText(formatSlotWhenLabel(first.slotStart, timeZone)),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Reschedule this booking" }),
    ).toBeVisible();

    await page.getByRole("link", { name: "Reschedule this booking" }).click();

    await expect(
      page.getByRole("heading", {
        name: "Reschedule your booking with Tyler Dane",
      }),
    ).toBeFocused();
    await expect(page).toHaveURL(
      /\/book\/reschedule\/000000000000000000000099\?token=abc/,
    );

    await page
      .getByRole("button", { name: formatSlotButtonLabel(second.slotStart) })
      .click();
    await page.getByRole("button", { name: "Confirm" }).click();

    await expect(
      page.getByRole("heading", { name: "You are booked with Tyler Dane" }),
    ).toBeVisible();
    await expect(
      page.getByText(formatSlotWhenLabel(second.slotStart, timeZone)),
    ).toBeVisible();
    await expect(
      page.getByText(formatSlotWhenLabel(first.slotStart, timeZone)),
    ).toHaveCount(0);
    expect(captured.reschedulePosts).toHaveLength(1);
    expect(captured.reschedulePosts[0]).toMatchObject({
      token: "abc",
      slotStart: second.slotStart,
    });
  });

  test("reaches Confirm with the keyboard", async ({ page }) => {
    const { slotStart } = buildBookableSlot();
    const captured = await preparePublicBookingReschedulePage(page);

    await expect(
      page.getByRole("heading", {
        name: "Reschedule your booking with Tyler Dane",
      }),
    ).toBeFocused();

    const slotButton = page.getByRole("button", {
      name: formatSlotButtonLabel(slotStart),
    });
    await slotButton.focus();
    await page.keyboard.press("Enter");

    const confirm = page.getByRole("button", { name: "Confirm" });
    await expect(confirm).toBeVisible();
    for (let hop = 0; hop < 20; hop += 1) {
      if (await confirm.evaluate((el) => el === document.activeElement)) {
        break;
      }
      await page.keyboard.press("Tab");
    }
    await expect(confirm).toBeFocused();
    await page.keyboard.press("Enter");

    await expect(
      page.getByRole("heading", { name: "You are booked with Tyler Dane" }),
    ).toBeVisible();
    expect(captured.reschedulePosts).toHaveLength(1);
    expect(captured.reschedulePosts[0]).toMatchObject({
      token: "abc",
      slotStart,
    });
  });

  test("missing token is not-found and does not fetch slots", async ({
    page,
  }) => {
    const captured = await preparePublicBookingReschedulePage(page, {
      token: "",
    });

    await expect(
      page.getByRole("heading", { name: "Booking not found" }),
    ).toBeFocused();
    await expect(
      page.getByRole("heading", {
        name: "Reschedule your booking with Tyler Dane",
      }),
    ).toHaveCount(0);
    expect(captured.reservationSlotGets).toBe(0);
    expect(captured.reschedulePosts).toHaveLength(0);
  });
});
