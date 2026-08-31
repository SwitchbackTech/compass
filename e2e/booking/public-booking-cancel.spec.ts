import { expect, test } from "@playwright/test";
import { preparePublicBookingCancelPage } from "./booking-harness";

test.describe("public booking cancel page", () => {
  test("does not POST on load, only after clicking confirm", async ({
    page,
  }) => {
    const captured = await preparePublicBookingCancelPage(page);

    await expect(
      page.getByRole("heading", { name: "Cancel this booking?" }),
    ).toBeVisible();
    expect(captured.cancelPosts).toHaveLength(0);

    await page.getByRole("button", { name: "Cancel this booking" }).click();

    await expect(
      page.getByRole("heading", { name: "Booking canceled" }),
    ).toBeVisible();
    expect(captured.cancelPosts).toHaveLength(1);
    expect(captured.cancelPosts[0]).toMatchObject({ token: "abc" });
  });

  test("focuses the heading on load and reaches confirm with the keyboard", async ({
    page,
  }) => {
    await preparePublicBookingCancelPage(page);

    const heading = page.getByRole("heading", { name: "Cancel this booking?" });
    await expect(heading).toBeFocused();

    await page.keyboard.press("Tab");
    await expect(
      page.getByRole("button", { name: "Cancel this booking" }),
    ).toBeFocused();
  });

  test("shows a distinct error heading from the canceled state", async ({
    page,
  }) => {
    await preparePublicBookingCancelPage(page, { cancelStatus: 500 });

    await page.getByRole("button", { name: "Cancel this booking" }).click();

    await expect(
      page.getByRole("heading", { name: "Could not cancel booking" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Booking canceled" }),
    ).not.toBeVisible();
  });
});
