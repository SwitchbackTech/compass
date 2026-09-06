import { expect, test } from "@playwright/test";
import { prepareSignedInMicrosoftPage } from "../attendees/attendee-harness";
import { prepareSignedInBookingSettingsPage } from "../booking/booking-harness";

const CONSENT_REQUIRED_COPY =
  "Your organization's admin has to approve Compass before this account can connect.";

const MICROSOFT_AUTHORIZE_URL =
  "https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=test";

test.use({ viewport: { width: 1600, height: 900 } });

test("shows a Microsoft connected toast from the connect-status query", async ({
  page,
}) => {
  await page.addInitScript(() => {
    (
      window as Window & { __COMPASS_E2E_TEST__?: boolean }
    ).__COMPASS_E2E_TEST__ = true;
  });

  await page.route("**/api/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: "{}",
    });
  });

  await page.goto("/week?provider=microsoft&status=connected", {
    waitUntil: "domcontentloaded",
  });

  await expect(page.getByText("Microsoft connected.")).toBeVisible();
});

test("shows the admin-consent banner for a Microsoft connection", async ({
  page,
}) => {
  await prepareSignedInMicrosoftPage(page, {
    events: [],
    stateReason: "consentRequired",
  });

  await expect(
    page.getByRole("alert").getByText(CONSENT_REQUIRED_COPY),
  ).toBeVisible();
});

test("Add account starts Microsoft OAuth from the chooser", async ({
  page,
}) => {
  await prepareSignedInBookingSettingsPage(page, { microsoftConnect: true });

  let beginBody: Record<string, unknown> | undefined;
  await page.route("**/api/auth/connections/begin", async (route) => {
    if (route.request().method() !== "POST") {
      return route.fallback();
    }
    beginBody = route.request().postDataJSON() as Record<string, unknown>;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        kind: "redirect",
        authorizationUrl: MICROSOFT_AUTHORIZE_URL,
      }),
    });
  });

  const settingsDialog = page.getByRole("dialog", { name: "Settings" });
  await settingsDialog.getByRole("button", { name: "Accounts" }).click();
  const addAccount = settingsDialog.getByRole("button", {
    name: "Add account",
  });
  await expect(addAccount).toBeVisible();
  await addAccount.click();
  await expect(settingsDialog.getByRole("menu")).toBeVisible();

  await Promise.all([
    page.waitForURL(
      /login\.microsoftonline\.com\/common\/oauth2\/v2\.0\/authorize/,
    ),
    settingsDialog.getByRole("menuitem", { name: "Microsoft" }).click(),
  ]);

  expect(beginBody).toMatchObject({ provider: "microsoft" });
});
