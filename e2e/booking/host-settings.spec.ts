import { expect, type Locator, test } from "@playwright/test";
import { DEFAULT_WEEKLY_AVAILABILITY } from "@core/types/booking.contracts";
import {
  BOOKING_CALENDAR_ID,
  COMPASS_CALENDAR_ID,
  dispatchClick,
  dispatchFill,
  prepareSignedInBookingSettingsPage,
} from "./booking-harness";

test.use({ viewport: { width: 1600, height: 900 } });

const openMoreOptions = async (settingsDialog: Locator) => {
  await settingsDialog.getByText("More options", { exact: true }).click();
};

test("settings booking page shows a copyable public link after save", async ({
  page,
}) => {
  const bookingUrl = "https://compasscalendar.com/meet/hostuser";
  const captured = await prepareSignedInBookingSettingsPage(page, {
    bookingUrl,
  });

  const settingsDialog = page.getByRole("dialog", { name: "Settings" });
  await settingsDialog.getByLabel("Duration").selectOption("30");
  await dispatchClick(
    settingsDialog.getByRole("button", { name: "Save changes" }),
  );

  await expect.poll(() => captured.putBodies.length).toBe(1);
  await expect(
    settingsDialog.getByRole("textbox", { name: "Meeting link" }),
  ).toHaveValue(bookingUrl);
  await expect(
    settingsDialog.getByRole("link", { name: "Open meeting page" }),
  ).toHaveAttribute("href", bookingUrl);
  expect(captured.putBodies[0]).toMatchObject({ durationMinutes: 30 });

  await settingsDialog.getByLabel("Duration").selectOption("15");
  await dispatchClick(
    settingsDialog.getByRole("button", { name: "Save changes" }),
  );

  await expect.poll(() => captured.putBodies.length).toBe(2);
  expect(captured.putBodies[1]).toMatchObject({ durationMinutes: 15 });
});

test("clearing the horizon field shows an inline error and blocks save", async ({
  page,
}) => {
  const captured = await prepareSignedInBookingSettingsPage(page);

  const settingsDialog = page.getByRole("dialog", { name: "Settings" });
  await openMoreOptions(settingsDialog);
  const horizon = settingsDialog.getByLabel("Maximum horizon (days)");
  await dispatchFill(horizon, "");

  await expect(settingsDialog.getByText("Enter 1 to 60 days.")).toBeVisible();
  await expect(horizon).toHaveAttribute("aria-invalid", "true");

  await dispatchClick(
    settingsDialog.getByRole("button", { name: "Save changes" }),
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
    settingsDialog.getByRole("button", { name: "Save changes" }),
  );

  await expect.poll(() => captured.putBodies.length).toBe(1);
  expect(captured.putBodies[0]).toMatchObject({ maxHorizonDays: 30 });
});

test("saves welcome text", async ({ page }) => {
  const bookingUrl = "https://compasscalendar.com/meet/hostuser";
  const captured = await prepareSignedInBookingSettingsPage(page, {
    bookingUrl,
  });

  const settingsDialog = page.getByRole("dialog", { name: "Settings" });
  await openMoreOptions(settingsDialog);
  await dispatchFill(
    settingsDialog.getByLabel("Welcome text"),
    "30 minutes to talk through Compass.",
  );
  await dispatchClick(
    settingsDialog.getByRole("button", { name: "Save changes" }),
  );

  await expect.poll(() => captured.putBodies.length).toBe(1);
  expect(captured.putBodies[0]).toMatchObject({
    welcomeText: "30 minutes to talk through Compass.",
  });
  await expect(
    settingsDialog.getByRole("link", { name: "Open meeting page" }),
  ).toHaveAttribute("href", bookingUrl);
});

test("keyboard hint sits in the nav column and the last control stays above Save", async ({
  page,
}) => {
  await prepareSignedInBookingSettingsPage(page, {
    bookingUrl: "https://compasscalendar.com/meet/hostuser",
  });

  const settingsDialog = page.getByRole("dialog", { name: "Settings" });
  await openMoreOptions(settingsDialog);
  const hint = settingsDialog.locator("nav p", {
    hasText: "to see shortcuts.",
  });
  const lastControl = settingsDialog.getByRole("checkbox", {
    name: "Guest can invite others",
  });
  const save = settingsDialog.getByRole("button", {
    name: "Save changes",
  });

  await expect(hint).toBeVisible();

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
  await openMoreOptions(settingsDialog);
  const compass = settingsDialog.getByRole("checkbox", { name: "Compass" });
  await expect(compass).toBeVisible();
  await expect(
    settingsDialog.getByRole("checkbox", { name: "Work" }),
  ).toBeVisible();
  await expect.poll(async () => compass.isChecked()).toBe(false);
  await compass.evaluate((el) => {
    (el as HTMLInputElement).click();
  });
  await expect(compass).toBeChecked();

  await dispatchClick(
    settingsDialog.getByRole("button", { name: "Save changes" }),
  );

  await expect.poll(() => captured.putBodies.length).toBe(1);
  expect(captured.putBodies[0]?.blockingCalendarIds).toEqual(
    expect.arrayContaining([BOOKING_CALENDAR_ID, COMPASS_CALENDAR_ID]),
  );
});

test("turns on a not-live page in one click", async ({ page }) => {
  const captured = await prepareSignedInBookingSettingsPage(page, {
    enabled: false,
  });

  const settingsDialog = page.getByRole("dialog", { name: "Settings" });
  await dispatchClick(
    settingsDialog.getByRole("button", { name: "Turn on meeting page" }),
  );

  await expect.poll(() => captured.putBodies.length).toBe(1);
  expect(captured.putBodies[0]).toMatchObject({ enabled: true });
});

test("turns a not-live unconfigured page on in one click", async ({ page }) => {
  const captured = await prepareSignedInBookingSettingsPage(page, {
    configured: false,
    enabled: false,
  });

  const settingsDialog = page.getByRole("dialog", { name: "Settings" });
  await expect(
    settingsDialog.getByText("Your meeting page is not live yet"),
  ).toBeVisible();
  await expect(settingsDialog.getByLabel("Page address")).toHaveValue(
    "hostuser",
  );
  await expect(
    settingsDialog.getByText(/It will be at .*\/meet\/hostuser/),
  ).toBeVisible();

  await dispatchClick(
    settingsDialog.getByRole("button", { name: "Turn on meeting page" }),
  );

  await expect.poll(() => captured.putBodies.length).toBe(1);
  expect(captured.putBodies[0]).toMatchObject({
    enabled: true,
    weeklyAvailability: DEFAULT_WEEKLY_AVAILABILITY,
  });

  await expect(
    settingsDialog.getByText("Your meeting page is live"),
  ).toBeVisible();
  await expect(
    settingsDialog.getByRole("textbox", { name: "Meeting link" }),
  ).toHaveValue("https://compasscalendar.com/meet/hostuser");
  await expect(
    settingsDialog.getByRole("button", { name: "Copy meeting link" }),
  ).toBeVisible();
  await expect(
    settingsDialog.getByRole("link", { name: "Open meeting page" }),
  ).toHaveAttribute("href", "https://compasscalendar.com/meet/hostuser");
});

test("blocks turn on with empty hours", async ({ page }) => {
  const captured = await prepareSignedInBookingSettingsPage(page, {
    enabled: false,
    weeklyAvailability: [],
  });

  const settingsDialog = page.getByRole("dialog", { name: "Settings" });
  await dispatchClick(
    settingsDialog.getByRole("button", { name: "Turn on meeting page" }),
  );

  await expect(
    settingsDialog.getByRole("alert").filter({
      hasText: "Add weekly hours before turning on your meeting page.",
    }),
  ).toBeVisible();
  expect(captured.putBodies.length).toBe(0);
});

test("changes the page address and PUTs slug", async ({ page }) => {
  const captured = await prepareSignedInBookingSettingsPage(page);

  const settingsDialog = page.getByRole("dialog", { name: "Settings" });
  await dispatchFill(settingsDialog.getByLabel("Page address"), "new-address");
  await dispatchClick(
    settingsDialog.getByRole("button", { name: "Save changes" }),
  );

  await expect.poll(() => captured.putBodies.length).toBe(1);
  expect(captured.putBodies[0]).toMatchObject({ slug: "new-address" });
});

test("essentials fit without scrolling at 1440x900", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await prepareSignedInBookingSettingsPage(page);

  const settingsDialog = page.getByRole("dialog", { name: "Settings" });
  const summary = settingsDialog.getByText("More options", { exact: true });
  await expect(summary).toBeVisible();

  await settingsDialog.evaluate((el) => {
    el.scrollTop = 0;
  });

  const dialogBox = await settingsDialog.boundingBox();
  const summaryBox = await summary.boundingBox();
  expect(dialogBox).not.toBeNull();
  expect(summaryBox).not.toBeNull();
  expect(summaryBox!.y + summaryBox!.height).toBeLessThanOrEqual(
    dialogBox!.y + dialogBox!.height,
  );
});
