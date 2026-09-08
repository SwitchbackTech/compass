import { expect, test } from "@playwright/test";
import { preparePublicBookingCancelPage } from "./booking-harness";

test.describe("public booking cancel page", () => {
  test("does not POST on load, only after clicking confirm", async ({
    page,
  }) => {
    const captured = await preparePublicBookingCancelPage(page);

    await expect(
      page.getByRole("heading", { name: "Cancel this meeting?" }),
    ).toBeVisible();
    await expect(
      page.getByText("You are canceling a meeting with Tyler Dane."),
    ).toBeVisible();
    await expect(page.getByText("When")).toBeVisible();
    await expect(page.getByText("Duration")).toBeVisible();
    await expect(page.getByText("Timezone")).toBeVisible();
    expect(captured.cancelPosts).toHaveLength(0);

    await page.getByRole("button", { name: "Cancel this meeting" }).click();

    await expect(
      page.getByRole("heading", { name: "Meeting canceled" }),
    ).toBeFocused();
    expect(captured.cancelPosts).toHaveLength(1);
    expect(captured.cancelPosts[0]).toMatchObject({ token: "abc" });
  });

  test("focuses the heading on load and reaches confirm with the keyboard", async ({
    page,
  }) => {
    await preparePublicBookingCancelPage(page);

    const heading = page.getByRole("heading", { name: "Cancel this meeting?" });
    await expect(heading).toBeFocused();

    await page.keyboard.press("Tab");
    await expect(
      page.getByRole("button", { name: "Cancel this meeting" }),
    ).toBeFocused();
  });

  test("skips confirmation when the reservation is already cancelled", async ({
    page,
  }) => {
    const captured = await preparePublicBookingCancelPage(page, {
      reservationStatus: "cancelled",
    });

    await expect(
      page.getByRole("heading", { name: "Meeting canceled" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Cancel this meeting" }),
    ).toHaveCount(0);
    expect(captured.cancelPosts).toHaveLength(0);
  });

  test("shows a distinct error heading from the canceled state", async ({
    page,
  }) => {
    await preparePublicBookingCancelPage(page, { cancelStatus: 500 });

    await page.getByRole("button", { name: "Cancel this meeting" }).click();

    await expect(
      page.getByRole("heading", { name: "Could not cancel meeting" }),
    ).toBeFocused();
    await expect(
      page.getByRole("heading", { name: "Meeting canceled" }),
    ).not.toBeVisible();
  });
});
