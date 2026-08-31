import { expect, test } from "@playwright/test";
import {
  preparePublicBookingCancelPage,
  preparePublicBookingPage,
} from "../booking/booking-harness";
import { expectNoAxeViolations } from "../utils/axe-assertion";

test("the public booking page renders with no automatically detectable accessibility violations", async ({
  page,
}) => {
  await preparePublicBookingPage(page);

  await expect(
    page.getByRole("heading", { name: "Pick a time" }),
  ).toBeVisible();
  await expectNoAxeViolations(page, { checkpoint: "public booking page" });
});

test.describe("public booking cancel page", () => {
  test("confirm state has no automatically detectable accessibility violations", async ({
    page,
  }) => {
    await preparePublicBookingCancelPage(page);
    await expect(
      page.getByRole("heading", { name: "Cancel this booking?" }),
    ).toBeVisible();
    await expectNoAxeViolations(page, { checkpoint: "cancel confirm" });
  });

  test("cancelling state has no automatically detectable accessibility violations", async ({
    page,
  }) => {
    let release!: () => void;
    const holdCancel = new Promise<void>((resolve) => {
      release = resolve;
    });
    await preparePublicBookingCancelPage(page, { holdCancel });
    await page.getByRole("button", { name: "Cancel this booking" }).click();
    await expect(
      page.getByRole("button", { name: "Canceling..." }),
    ).toBeVisible();
    await expectNoAxeViolations(page, { checkpoint: "cancel in-flight" });
    release();
    await expect(
      page.getByRole("heading", { name: "Booking canceled" }),
    ).toBeVisible();
  });

  test("canceled state has no automatically detectable accessibility violations", async ({
    page,
  }) => {
    await preparePublicBookingCancelPage(page);
    await page.getByRole("button", { name: "Cancel this booking" }).click();
    await expect(
      page.getByRole("heading", { name: "Booking canceled" }),
    ).toBeVisible();
    await expectNoAxeViolations(page, { checkpoint: "cancel success" });
  });

  test("not-found state has no automatically detectable accessibility violations", async ({
    page,
  }) => {
    await preparePublicBookingCancelPage(page, { token: "" });
    await expect(
      page.getByRole("heading", { name: "Booking not found" }),
    ).toBeVisible();
    await expectNoAxeViolations(page, { checkpoint: "cancel not found" });
  });

  test("error state has no automatically detectable accessibility violations", async ({
    page,
  }) => {
    await preparePublicBookingCancelPage(page, { cancelStatus: 500 });
    await page.getByRole("button", { name: "Cancel this booking" }).click();
    await expect(
      page.getByRole("heading", { name: "Could not cancel booking" }),
    ).toBeVisible();
    await expectNoAxeViolations(page, { checkpoint: "cancel error" });
  });
});
