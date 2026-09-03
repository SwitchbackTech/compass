import { expect, test } from "@playwright/test";
import {
  BOOKING_CALENDAR_ID,
  COMPASS_CALENDAR_ID,
  dispatchClick,
  dispatchFill,
  prepareSignedInBookingSettingsPage,
} from "./booking-harness";

test.use({ viewport: { width: 1600, height: 900 } });

test("settings booking page shows a copyable public link after save", async ({
  page,
}) => {
  const bookingUrl = "https://compasscalendar.com/book/hostuser";
  const captured = await prepareSignedInBookingSettingsPage(page, {
    bookingUrl,
  });

  const settingsDialog = page.getByRole("dialog", { name: "Settings" });
  await settingsDialog.getByLabel("Duration").selectOption("30");
  await dispatchClick(
    settingsDialog.getByRole("button", { name: "Save booking settings" }),
  );

  await expect.poll(() => captured.putBodies.length).toBe(1);
  await expect(settingsDialog.getByLabel("Public booking link")).toHaveValue(
    bookingUrl,
  );
  await expect(
    settingsDialog.getByRole("link", { name: "Open booking page" }),
  ).toHaveAttribute("href", bookingUrl);
  expect(captured.putBodies[0]).toMatchObject({ durationMinutes: 30 });

  // A second save has to reach the network too. Seeding the form from the
  // saved-page response used to smuggle response-only keys into the strict
  // PUT schema, so every save after the first died before the request.
  await settingsDialog.getByLabel("Duration").selectOption("15");
  await dispatchClick(
    settingsDialog.getByRole("button", { name: "Save booking settings" }),
  );

  await expect.poll(() => captured.putBodies.length).toBe(2);
  expect(captured.putBodies[1]).toMatchObject({ durationMinutes: 15 });
});

test("clearing the horizon field shows an inline error and blocks save", async ({
  page,
}) => {
  const captured = await prepareSignedInBookingSettingsPage(page);

  const settingsDialog = page.getByRole("dialog", { name: "Settings" });
  const horizon = settingsDialog.getByLabel("Maximum horizon (days)");
  await dispatchFill(horizon, "");

  await expect(settingsDialog.getByText("Enter 1 to 60 days.")).toBeVisible();
  await expect(horizon).toHaveAttribute("aria-invalid", "true");

  await dispatchClick(
    settingsDialog.getByRole("button", { name: "Save booking settings" }),
  );
  await expect(
    settingsDialog.getByText(
      "Fix the highlighted number fields before saving.",
    ),
  ).toBeVisible();
  expect(captured.putBodies.length).toBe(0);

  await dispatchFill(horizon, "30");
  await expect(settingsDialog.getByText("Enter 1 to 60 days.")).toHaveCount(0);
  await dispatchClick(
    settingsDialog.getByRole("button", { name: "Save booking settings" }),
  );

  await expect.poll(() => captured.putBodies.length).toBe(1);
  expect(captured.putBodies[0]).toMatchObject({ maxHorizonDays: 30 });
});

test("saves welcome text", async ({ page }) => {
  const bookingUrl = "https://compasscalendar.com/book/hostuser";
  const captured = await prepareSignedInBookingSettingsPage(page, {
    bookingUrl,
  });

  const settingsDialog = page.getByRole("dialog", { name: "Settings" });
  await dispatchFill(
    settingsDialog.getByLabel("Welcome text"),
    "30 minutes to talk through Compass.",
  );
  await dispatchClick(
    settingsDialog.getByRole("button", { name: "Save booking settings" }),
  );

  await expect.poll(() => captured.putBodies.length).toBe(1);
  expect(captured.putBodies[0]).toMatchObject({
    welcomeText: "30 minutes to talk through Compass.",
  });
  await expect(
    settingsDialog.getByRole("link", { name: "Open booking page" }),
  ).toHaveAttribute("href", bookingUrl);
});

test("keyboard hint sits above the public link and the last control stays above Save", async ({
  page,
}) => {
  await prepareSignedInBookingSettingsPage(page, {
    bookingUrl: "https://compasscalendar.com/book/hostuser",
  });

  const settingsDialog = page.getByRole("dialog", { name: "Settings" });
  const hint = settingsDialog
    .locator("p")
    .filter({ hasText: "then a letter to jump to a field" });
  const publicLink = settingsDialog.getByLabel("Public booking link");
  const lastControl = settingsDialog.getByRole("checkbox", {
    name: "Guest can invite others",
  });
  const save = settingsDialog.getByRole("button", {
    name: "Save booking settings",
  });

  await expect(hint).toBeVisible();
  const hintBox = await hint.boundingBox();
  const linkBox = await publicLink.boundingBox();
  expect(hintBox).not.toBeNull();
  expect(linkBox).not.toBeNull();
  expect(hintBox!.y + hintBox!.height).toBeLessThan(linkBox!.y);

  await lastControl.scrollIntoViewIfNeeded();
  await settingsDialog.evaluate((el) => {
    el.scrollTop = el.scrollHeight;
  });

  const lastBox = await lastControl.boundingBox();
  const saveBarTop = await save.evaluate((el) => {
    const bar = el.closest(".sticky");
    return bar?.getBoundingClientRect().y ?? null;
  });
  expect(lastBox).not.toBeNull();
  expect(saveBarTop).not.toBeNull();
  expect(lastBox!.y + lastBox!.height).toBeLessThanOrEqual(saveBarTop!);
});

test("saves with Compass checked as a blocking calendar", async ({ page }) => {
  const captured = await prepareSignedInBookingSettingsPage(page);

  const settingsDialog = page.getByRole("dialog", { name: "Settings" });
  const compass = settingsDialog.getByRole("checkbox", { name: "Compass" });
  await expect(compass).toBeVisible();
  // Calendars query replaces the synthetic local Compass id. Wait for Work
  // (the stubbed Google calendar) so Compass is the fixture, not a placeholder.
  await expect(
    settingsDialog.getByRole("checkbox", { name: "Work" }),
  ).toBeVisible();
  // Placeholder defaults check Compass first; the saved-page seed then
  // unchecks it. Wait for that before checking it for the PUT.
  await expect.poll(async () => compass.isChecked()).toBe(false);
  await compass.evaluate((el) => {
    (el as HTMLInputElement).click();
  });
  await expect(compass).toBeChecked();

  await dispatchClick(
    settingsDialog.getByRole("button", { name: "Save booking settings" }),
  );

  await expect.poll(() => captured.putBodies.length).toBe(1);
  expect(captured.putBodies[0]?.blockingCalendarIds).toEqual(
    expect.arrayContaining([BOOKING_CALENDAR_ID, COMPASS_CALENDAR_ID]),
  );
});
