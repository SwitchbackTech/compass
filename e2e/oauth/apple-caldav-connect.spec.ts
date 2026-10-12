import { expect, test } from "@playwright/test";
import { prepareCalendarPage } from "../utils/event-test-utils";

const CONNECT_OTHER_ICLOUD_LINK = "Other / iCloud";

import { E2E_APP_CONFIG_VERSION } from "../utils/test-constants";

test("connects Apple Calendar through the iCloud fallback form against a mocked API", async ({
  page,
}) => {
  let credentialPosted = false;

  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    const { pathname } = url;
    const method = route.request().method();

    if (pathname.endsWith("/api/config")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          version: E2E_APP_CONFIG_VERSION,
          providers: {
            google: { signIn: true, connect: true },
            microsoft: { signIn: true, connect: true },
            apple: { signIn: false, connect: true },
          },
        }),
      });
    }

    if (pathname.endsWith("/api/user/metadata") && method === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ connections: [] }),
      });
    }

    if (
      pathname.endsWith("/api/auth/connections/credential") &&
      method === "POST"
    ) {
      credentialPosted = true;
      const body = route.request().postDataJSON() as {
        provider?: string;
        username?: string;
      };
      expect(body.provider).toBe("apple");
      expect(body.username).toBe("user@icloud.com");
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          kind: "connected",
          connectionId: "507f1f77bcf86cd799439011",
        }),
      });
    }

    if (pathname.endsWith("/api/calendars")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ calendars: [] }),
      });
    }

    if (pathname.endsWith("/api/event") && method === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ events: [] }),
      });
    }

    return route.continue();
  });

  await prepareCalendarPage(page);
  await page.addInitScript(() => {
    localStorage.setItem(
      "compass.auth",
      JSON.stringify({
        hasAuthenticated: true,
        lastKnownEmail: "user@icloud.com",
      }),
    );
    localStorage.setItem("compass.onboarding.has-seen-welcome", "true");
    localStorage.setItem(
      "compass.onboarding.has-seen-shortcut-showcase",
      "true",
    );
  });
  await page.reload({ waitUntil: "domcontentloaded" });

  await expect(
    page.getByRole("dialog", { name: "Connect the calendar you use" }),
  ).toBeVisible({ timeout: 15000 });

  await page.getByRole("button", { name: CONNECT_OTHER_ICLOUD_LINK }).click();

  await expect(
    page.getByRole("dialog", { name: "Connect Apple Calendar" }),
  ).toBeVisible();

  await page.getByLabel("Apple ID email").fill("user@icloud.com");
  await page.getByLabel("App-specific password").fill("xxxx-xxxx-xxxx-xxxx");
  await page.getByRole("button", { name: "Connect Apple Calendar" }).click();

  await expect(page.getByText("Apple connected.")).toBeVisible({
    timeout: 10000,
  });
  expect(credentialPosted).toBe(true);
});
