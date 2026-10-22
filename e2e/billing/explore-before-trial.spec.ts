import { expect, test } from "@playwright/test";
import { E2E_APP_CONFIG_VERSION } from "../utils/test-constants";

test.use({ viewport: { width: 1280, height: 800 } });

const jsonResponse = (body: unknown) => ({
  status: 200,
  contentType: "application/json",
  body: JSON.stringify(body),
});

const awaitingCheckoutRoutes = async (
  page: import("@playwright/test").Page,
  options: { blockEventPost?: boolean } = {},
) => {
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    const method = route.request().method();

    if (path.endsWith("/api/config")) {
      return route.fulfill(
        jsonResponse({
          version: E2E_APP_CONFIG_VERSION,
          providers: {
            google: { signIn: false, connect: false },
            microsoft: { signIn: false, connect: false },
            apple: { signIn: false, connect: false },
          },
          billing: {
            isConfigured: true,
            enforcement: true,
            trialLengthDays: 7,
            publishableKey: "pk_test_e2e",
          },
        }),
      );
    }

    if (path.endsWith("/api/billing/status")) {
      return route.fulfill(
        jsonResponse({
          subscriptionStatus: "awaiting_checkout",
          trialEndsAt: null,
          isReadOnly: true,
        }),
      );
    }

    if (path.endsWith("/api/billing/subscription")) {
      return route.fulfill(
        jsonResponse({
          subscriptionStatus: "awaiting_checkout",
          currentPeriodEnd: null,
          cancelAtPeriodEnd: false,
          trialEndsAt: null,
          price: { amount: 1200, currency: "usd", interval: "month" },
          paymentMethod: null,
          invoices: [],
        }),
      );
    }

    if (path.endsWith("/api/billing/checkout/session")) {
      return route.fulfill(
        jsonResponse({ clientSecret: "cs_test_e2e_explore_trial" }),
      );
    }

    if (path.endsWith("/api/calendars")) {
      return route.fulfill(
        jsonResponse({
          calendars: [
            {
              id: "cal-local-1",
              name: "Personal",
              color: "#5484ed",
              isPrimary: true,
              isWritable: true,
              providerManaged: false,
            },
          ],
        }),
      );
    }

    if (path.endsWith("/api/event") && method === "GET") {
      return route.fulfill(jsonResponse({ events: [] }));
    }

    if (
      options.blockEventPost &&
      path.endsWith("/api/event") &&
      method === "POST"
    ) {
      return route.fulfill({
        status: 402,
        contentType: "application/json",
        body: JSON.stringify({ code: "BILLING_REQUIRED" }),
      });
    }

    if (path.endsWith("/api/user/metadata")) {
      return route.fulfill(jsonResponse({ connections: [] }));
    }

    return route.fulfill(jsonResponse({}));
  });

  await page.route("https://js.stripe.com/**", (route) => route.abort());
  await page.route("https://*.stripe.com/**", (route) => route.abort());
};

const signInAwaitingCheckout = async (
  page: import("@playwright/test").Page,
) => {
  await page.addInitScript(() => {
    (
      window as Window & { __COMPASS_E2E_TEST__?: boolean }
    ).__COMPASS_E2E_TEST__ = true;
    localStorage.setItem(
      "compass.auth",
      JSON.stringify({
        hasAuthenticated: true,
        lastKnownEmail: "new@example.com",
      }),
    );
    localStorage.setItem("compass.onboarding.has-seen-welcome", "true");
    localStorage.setItem(
      "compass.onboarding.has-seen-shortcut-showcase",
      "true",
    );
    localStorage.setItem("compass.onboarding.first-event-done", "dismissed");
  });

  await page.goto("/week", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(
    () =>
      (
        window as Window & {
          __COMPASS_E2E_HOOKS__?: { setAuthenticated: (v: boolean) => void };
        }
      ).__COMPASS_E2E_HOOKS__ !== undefined,
  );
  await page.evaluate(() => {
    (
      window as Window & {
        __COMPASS_E2E_HOOKS__?: { setAuthenticated: (v: boolean) => void };
      }
    ).__COMPASS_E2E_HOOKS__?.setAuthenticated(true);
  });
};

test("explore banner dismiss hides until the next session", async ({
  page,
}) => {
  await awaitingCheckoutRoutes(page);
  await signInAwaitingCheckout(page);

  const bannerText = "Start your 7-day free trial to plan your week.";
  await expect(page.getByText(bannerText)).toBeVisible({ timeout: 15000 });
  await page.screenshot({
    path: "/opt/cursor/artifacts/before-explore-calendar-banner.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Dismiss" }).click();
  await expect(page.getByText(bannerText)).toHaveCount(0);

  await page.screenshot({
    path: "/opt/cursor/artifacts/after-explore-banner-dismissed.png",
    fullPage: true,
  });

  await page.evaluate(() => {
    sessionStorage.removeItem(
      "compass.billing.awaiting-checkout-banner-dismissed-session",
    );
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForFunction(
    () =>
      (
        window as Window & {
          __COMPASS_E2E_HOOKS__?: { setAuthenticated: (v: boolean) => void };
        }
      ).__COMPASS_E2E_HOOKS__ !== undefined,
  );
  await page.evaluate(() => {
    (
      window as Window & {
        __COMPASS_E2E_HOOKS__?: { setAuthenticated: (v: boolean) => void };
      }
    ).__COMPASS_E2E_HOOKS__?.setAuthenticated(true);
  });

  await expect(page.getByText(bannerText)).toBeVisible({ timeout: 15000 });
});

test("event create opens the trial step while settings navigation does not", async ({
  page,
}) => {
  await awaitingCheckoutRoutes(page);
  await signInAwaitingCheckout(page);

  await page.getByRole("button", { name: "Open settings" }).click();
  await expect(page.getByRole("dialog", { name: "Settings" })).toBeVisible({
    timeout: 10000,
  });
  await expect(
    page.getByRole("dialog", { name: "Start your 7-day free trial" }),
  ).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Settings" })).toHaveCount(0);

  await page.waitForResponse(
    (response) =>
      response.url().includes("/api/billing/status") && response.ok(),
  );
  await page.locator("#mainGrid").focus();
  await page.keyboard.press("c");

  const trialDialog = page.getByRole("dialog", {
    name: "Start your 7-day free trial",
  });
  await expect(trialDialog).toBeVisible({ timeout: 15000 });
  await trialDialog.screenshot({
    path: "/opt/cursor/artifacts/after-trial-step-from-event-create.png",
  });
});
