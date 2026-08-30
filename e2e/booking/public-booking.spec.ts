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

  test("refreshes slots and shows a conflict message on 409", async ({
    page,
  }) => {
    const { slotStart } = buildBookableSlot();
    const captured = await preparePublicBookingPage(page, {
      confirmStatus: 409,
    });

    await page
      .getByRole("button", { name: formatSlotButtonLabel(slotStart) })
      .click();
    await page.getByLabel("Name").fill("Guest User");
    await page.getByLabel("Email").fill("guest@example.com");
    await page.getByRole("button", { name: "Confirm booking" }).click();

    await expect(page.getByRole("alert")).toHaveText(
      "This time is no longer available. Pick another slot.",
    );
    await expect.poll(() => captured.slotGets).toBeGreaterThan(1);
  });
});
