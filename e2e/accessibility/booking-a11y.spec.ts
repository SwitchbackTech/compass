import { expect, test } from "@playwright/test";
import {
  buildBookableSlot,
  formatSlotButtonLabel,
  preparePublicBookingCancelPage,
  preparePublicBookingConfirmedPage,
  preparePublicBookingPage,
} from "../booking/booking-harness";
import { expectNoAxeViolations } from "../utils/axe-assertion";

test.describe("public booking page color scheme", () => {
  (["light", "dark"] as const).forEach((colorScheme) => {
    test.describe(`${colorScheme} OS`, () => {
      test.use({ colorScheme });

      test("the picker has no automatically detectable accessibility violations", async ({
        page,
      }) => {
        await preparePublicBookingPage(page);
        await expect(
          page.getByRole("heading", { name: "Pick a time" }),
        ).toBeVisible();
        if (colorScheme === "light") {
          await expect(page.locator("html")).toHaveAttribute(
            "data-theme",
            "light-beach",
          );
        } else {
          await expect(page.locator("html")).not.toHaveAttribute(
            "data-theme",
            "light-beach",
          );
        }
        await expectNoAxeViolations(page, {
          checkpoint: `public booking page ${colorScheme}`,
        });
      });

      test("the details step has no automatically detectable accessibility violations", async ({
        page,
      }) => {
        const { slotStart } = buildBookableSlot();
        await preparePublicBookingPage(page);
        await page
          .getByRole("button", { name: formatSlotButtonLabel(slotStart) })
          .click();
        await expect(
          page.getByRole("heading", { name: "Your details" }),
        ).toBeVisible();
        await expectNoAxeViolations(page, {
          checkpoint: `public booking details ${colorScheme}`,
        });
      });
    });
  });
});

test("the public booking slots error has no automatically detectable accessibility violations", async ({
  page,
}) => {
  const slotFailGate = { fail: true };
  await preparePublicBookingPage(page, { slotFailGate });

  await expect(page.getByRole("button", { name: "Retry" })).toBeVisible();
  await expectNoAxeViolations(page, {
    checkpoint: "public booking slots error",
  });
});

test("the public booking conflict alert has no automatically detectable accessibility violations", async ({
  page,
}) => {
  const { slotStart } = buildBookableSlot();
  await preparePublicBookingPage(page, { confirmStatus: 409 });

  await page
    .getByRole("button", { name: formatSlotButtonLabel(slotStart) })
    .click();
  await page.getByLabel("Name").fill("Guest User");
  await page.getByLabel("Email").fill("guest@example.com");
  await page.getByRole("button", { name: "Confirm booking" }).click();

  await expect(page.getByRole("alert")).toBeVisible();
  await expectNoAxeViolations(page, { checkpoint: "public booking conflict" });
});

test.describe("public booking confirmation page", () => {
  test("confirmed state has no automatically detectable accessibility violations", async ({
    page,
  }) => {
    await preparePublicBookingConfirmedPage(page);
    await expect(
      page.getByRole("heading", { name: "You are booked with Tyler Dane" }),
    ).toBeVisible();
    await expectNoAxeViolations(page, {
      checkpoint: "booking confirmation permalink",
    });
  });

  test("cancelled state has no automatically detectable accessibility violations", async ({
    page,
  }) => {
    await preparePublicBookingConfirmedPage(page, {
      reservationStatus: "cancelled",
    });
    await expect(
      page.getByRole("heading", { name: "This booking was canceled" }),
    ).toBeVisible();
    await expectNoAxeViolations(page, {
      checkpoint: "booking confirmation cancelled",
    });
  });

  test("not-found state has no automatically detectable accessibility violations", async ({
    page,
  }) => {
    await preparePublicBookingConfirmedPage(page, {
      reservationNotFound: true,
    });
    await expect(
      page.getByRole("heading", { name: "Booking not found" }),
    ).toBeVisible();
    await expectNoAxeViolations(page, {
      checkpoint: "booking confirmation not found",
    });
  });

  test("load-error state has no automatically detectable accessibility violations", async ({
    page,
  }) => {
    await preparePublicBookingConfirmedPage(page, {
      reservationGetStatus: 500,
    });
    await expect(
      page.getByRole("heading", { name: "Could not load booking" }),
    ).toBeVisible();
    await expectNoAxeViolations(page, {
      checkpoint: "booking confirmation load error",
    });
  });
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
