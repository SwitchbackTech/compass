import { expect, test } from "@playwright/test";
import { E2E_APP_CONFIG_VERSION } from "../utils/test-constants";

const CONNECT_OTHER_ICLOUD_LINK = "Other / iCloud";

function jsonResponse(body: unknown) {
  return {
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(body),
  };
}

test("connects Apple Calendar through the iCloud fallback form against a mocked API", async ({
  page,
}) => {
  let credentialPosted = false;

  await page.addInitScript(() => {
    (
      window as Window & { __COMPASS_E2E_TEST__?: boolean }
    ).__COMPASS_E2E_TEST__ = true;
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

  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const method = request.method();

    if (path.endsWith("/api/config")) {
      return route.fulfill(
        jsonResponse({
          version: E2E_APP_CONFIG_VERSION,
          providers: {
            google: { signIn: true, connect: true },
            microsoft: { signIn: true, connect: true },
            apple: { signIn: false, connect: true },
          },
        }),
      );
    }

    if (path.endsWith("/api/user/metadata") && method === "GET") {
      return route.fulfill(jsonResponse({ connections: [] }));
    }

    if (
      path.endsWith("/api/auth/connections/credential") &&
      method === "POST"
    ) {
      credentialPosted = true;
      const body = request.postDataJSON() as {
        provider?: string;
        username?: string;
      };
      expect(body.provider).toBe("apple");
      expect(body.username).toBe("user@icloud.com");
      return route.fulfill(
        jsonResponse({
          kind: "connected",
          connectionId: "507f1f77bcf86cd799439011",
        }),
      );
    }

    if (path.endsWith("/api/calendars")) {
      return route.fulfill(jsonResponse({ calendars: [] }));
    }

    if (path.endsWith("/api/event") && method === "GET") {
      return route.fulfill(jsonResponse({ events: [] }));
    }

    return route.fulfill(jsonResponse({}));
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

  await expect(
    page.getByRole("dialog", { name: "Connect the calendar you use" }),
  ).toBeVisible({ timeout: 15000 });

  await page.getByRole("button", { name: CONNECT_OTHER_ICLOUD_LINK }).click();

  await expect(
    page.getByRole("dialog", { name: "Connect Apple Calendar" }),
  ).toBeVisible();

  await page.getByLabel("Apple ID email").fill("user@icloud.com");
  await page.getByLabel("App-specific password").fill("xxxx-xxxx-xxxx-xxxx");
  await page.getByRole("button", { name: "Connect", exact: true }).click();

  await expect(page.getByText("Apple connected.")).toBeVisible({
    timeout: 10000,
  });
  expect(credentialPosted).toBe(true);
});
