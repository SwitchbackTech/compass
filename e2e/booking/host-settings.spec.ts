import { expect, test } from "@playwright/test";
import {
  dispatchClick,
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
