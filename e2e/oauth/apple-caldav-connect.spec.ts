import { expect, test } from "@playwright/test";
import { E2E_APP_CONFIG_VERSION } from "../utils/test-constants";

type CompassE2EStoreWindow = Window & {
  __COMPASS_E2E_STORE__?: {
    connectApple?: {
      open: (initialEmail?: string) => void;
    };
  };
};

function jsonResponse(body: unknown) {
  return {
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(body),
  };
}

test("submits Apple CalDAV credentials against a mocked connect API", async ({
  page,
}) => {
  let credentialPosted = false;

  await page.route("**/*", async (route) => {
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
            microsoft: { signIn: false, connect: false },
            apple: { signIn: false, connect: true },
          },
        }),
      );
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

    return route.continue();
  });

  await page.goto("/week", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(
    () =>
      (window as CompassE2EStoreWindow).__COMPASS_E2E_STORE__?.connectApple !=
      null,
  );
  await page.evaluate(() => {
    (window as CompassE2EStoreWindow).__COMPASS_E2E_STORE__?.connectApple?.open(
      "user@icloud.com",
    );
  });

  await expect(
    page.getByRole("dialog", { name: "Connect Apple Calendar" }),
  ).toBeVisible();

  await page.getByLabel("App-specific password").fill("xxxx-xxxx-xxxx-xxxx");
  await page.getByRole("button", { name: "Connect", exact: true }).click();

  await expect(page.getByText("Apple connected.")).toBeVisible({
    timeout: 10000,
  });
  expect(credentialPosted).toBe(true);
});
