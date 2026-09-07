import { expect, test } from "@playwright/test";
import {
  buildBookableSlot,
  dispatchClick,
  dispatchFill,
  formatSlotButtonLabel,
  preparePublicBookingCancelPage,
  preparePublicBookingConfirmedPage,
  preparePublicBookingPage,
  preparePublicBookingReschedulePage,
  prepareSignedInBookingSettingsPage,
} from "../booking/booking-harness";
import { expectNoAxeViolations } from "../utils/axe-assertion";

test.describe("public booking page color scheme", () => {
  (
    [
      { name: "light", theme: "light-beach", stored: null },
      { name: "dark", theme: "dark-abyss", stored: "dark-abyss" },
    ] as const
  ).forEach(({ name, theme, stored }) => {
    test.describe(`${name} theme`, () => {
      test("the picker has no automatically detectable accessibility violations", async ({
        page,
      }) => {
        if (stored) {
          await page.addInitScript((value) => {
            localStorage.setItem("compass.theme", value);
          }, stored);
        }
        await preparePublicBookingPage(page);
        await expect(
          page.getByRole("heading", { name: "Pick a time" }),
        ).toBeVisible();
        await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
        await expectNoAxeViolations(page, {
          checkpoint: `public booking page ${name}`,
        });
      });

      test("the details step has no automatically detectable accessibility violations", async ({
        page,
      }) => {
        if (stored) {
          await page.addInitScript((value) => {
            localStorage.setItem("compass.theme", value);
          }, stored);
        }
        const { slotStart } = buildBookableSlot();
        await preparePublicBookingPage(page);
        await page
          .getByRole("button", { name: formatSlotButtonLabel(slotStart) })
          .click();
        await expect(
          page.getByRole("heading", { name: "Your details" }),
        ).toBeVisible();
        await expectNoAxeViolations(page, {
          checkpoint: `public booking details ${name}`,
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

  test("tokenized permalink confirmation has no automatically detectable accessibility violations", async ({
    page,
  }) => {
    await preparePublicBookingConfirmedPage(page, { token: "abc" });
    await expect(
      page.getByRole("heading", { name: "You are booked with Tyler Dane" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Edit details" }),
    ).toBeVisible();
    await expectNoAxeViolations(page, {
      checkpoint: "booking confirmation permalink with token",
    });
  });

  test("edit-details form has no automatically detectable accessibility violations", async ({
    page,
  }) => {
    await preparePublicBookingConfirmedPage(page, {
      token: "abc",
      guestName: "Ada Lovelace",
      notes: "bring coffee",
    });
    await page.getByRole("button", { name: "Edit details" }).click();
    await expect(
      page.getByRole("heading", { name: "Edit details" }),
    ).toBeVisible();
    await expect(page.getByLabel("Email")).toHaveCount(0);
    await expectNoAxeViolations(page, {
      checkpoint: "booking edit details",
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

test.describe("public booking reschedule page", () => {
  test("picker has no automatically detectable accessibility violations", async ({
    page,
  }) => {
    await preparePublicBookingReschedulePage(page);
    await expect(
      page.getByRole("heading", {
        name: "Reschedule your booking with Tyler Dane",
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Pick a time" }),
    ).toBeVisible();
    await expectNoAxeViolations(page, {
      checkpoint: "booking reschedule picker",
    });
  });

  test("not-found state has no automatically detectable accessibility violations", async ({
    page,
  }) => {
    await preparePublicBookingReschedulePage(page, { token: "" });
    await expect(
      page.getByRole("heading", { name: "Booking not found" }),
    ).toBeVisible();
    await expectNoAxeViolations(page, {
      checkpoint: "booking reschedule not found",
    });
  });

  test("canceled state has no automatically detectable accessibility violations", async ({
    page,
  }) => {
    await preparePublicBookingReschedulePage(page, {
      reservationStatus: "cancelled",
    });
    await expect(
      page.getByRole("heading", { name: "This booking was canceled" }),
    ).toBeVisible();
    await expectNoAxeViolations(page, {
      checkpoint: "booking reschedule canceled",
    });
  });

  test("conflict alert has no automatically detectable accessibility violations", async ({
    page,
  }) => {
    const { slotStart } = buildBookableSlot();
    await preparePublicBookingReschedulePage(page, { rescheduleStatus: 409 });
    await page
      .getByRole("button", { name: formatSlotButtonLabel(slotStart) })
      .click();
    await page.getByRole("button", { name: "Confirm" }).click();
    await expect(page.getByRole("alert")).toBeVisible();
    await expectNoAxeViolations(page, {
      checkpoint: "booking reschedule conflict",
    });
  });
});

test.describe("settings booking section", () => {
  test.use({ viewport: { width: 1600, height: 900 } });

  test("has no automatically detectable accessibility violations", async ({
    page,
  }) => {
    await prepareSignedInBookingSettingsPage(page);
    const settingsDialog = page.getByRole("dialog", { name: "Settings" });
    await expect(settingsDialog.getByLabel("Duration")).toBeVisible();
    // Scoped to the dialog: the calendar shell behind the modal is not this
    // suite's subject and has its own pre-existing findings.
    await expectNoAxeViolations(page, {
      checkpoint: "settings booking",
      include: "[role='dialog']",
    });
  });

  test("number-field errors have no automatically detectable accessibility violations", async ({
    page,
  }) => {
    await prepareSignedInBookingSettingsPage(page);
    const settingsDialog = page.getByRole("dialog", { name: "Settings" });
    await settingsDialog.getByText("More options", { exact: true }).click();
    await dispatchFill(settingsDialog.getByLabel("Maximum horizon (days)"), "");
    await expect(settingsDialog.getByText("Enter 1 to 60 days.")).toBeVisible();
    await expectNoAxeViolations(page, {
      checkpoint: "settings booking error",
      include: "[role='dialog']",
    });
  });

  test("inline save errors have no automatically detectable accessibility violations", async ({
    page,
  }) => {
    await prepareSignedInBookingSettingsPage(page, {
      enabled: false,
      weeklyAvailability: [],
    });
    const settingsDialog = page.getByRole("dialog", { name: "Settings" });
    await dispatchClick(
      settingsDialog.getByRole("button", { name: "Turn on booking page" }),
    );
    await expect(
      settingsDialog.getByRole("alert").filter({
        hasText: "Add weekly hours before turning on your booking page.",
      }),
    ).toBeVisible();
    await expectNoAxeViolations(page, {
      checkpoint: "settings booking inline save error",
      include: "[role='dialog']",
    });
  });

  test("address errors have no automatically detectable accessibility violations", async ({
    page,
  }) => {
    await prepareSignedInBookingSettingsPage(page);
    const settingsDialog = page.getByRole("dialog", { name: "Settings" });
    const address = settingsDialog.getByLabel("Page address");
    await dispatchFill(address, "ab");
    await address.evaluate((el) => {
      el.dispatchEvent(new Event("blur", { bubbles: true }));
    });
    await expect(
      settingsDialog.getByText(
        "Use 3 to 32 lowercase letters, digits, or hyphens",
      ),
    ).toBeVisible();
    await expectNoAxeViolations(page, {
      checkpoint: "settings booking address error",
      include: "[role='dialog']",
    });
  });

  test("address change warning has no automatically detectable accessibility violations", async ({
    page,
  }) => {
    await prepareSignedInBookingSettingsPage(page);
    const settingsDialog = page.getByRole("dialog", { name: "Settings" });
    await dispatchFill(
      settingsDialog.getByLabel("Page address"),
      "new-address",
    );
    await expect(
      settingsDialog.getByText(
        "Links using your old address will stop working.",
      ),
    ).toBeVisible();
    await expectNoAxeViolations(page, {
      checkpoint: "settings booking address warning",
      include: "[role='dialog']",
    });
  });

  test("discard confirmation has no automatically detectable accessibility violations", async ({
    page,
  }) => {
    await prepareSignedInBookingSettingsPage(page);
    const settingsDialog = page.getByRole("dialog", { name: "Settings" });
    await settingsDialog.getByLabel("Duration").selectOption("30");
    await page.keyboard.press("Escape");
    await expect(
      page.getByRole("dialog", { name: "Discard unsaved changes?" }),
    ).toBeVisible();
    await expectNoAxeViolations(page, {
      checkpoint: "settings booking discard confirmation",
      include: "[role='dialog']",
    });
  });
});
