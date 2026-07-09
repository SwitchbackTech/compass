import { expect, type Page, test } from "@playwright/test";

const CALLBACK_PATH = "/auth/google/callback";
const INTENT_STORAGE_PREFIX = "compass.googleAuthorizationIntent";
const REQUIRED_SCOPES = [
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/calendar.events",
];

const getIntentStorageKey = (state: string) =>
  `${INTENT_STORAGE_PREFIX}.${state}`;

const getCallbackUrl = (state: string) =>
  `${CALLBACK_PATH}?state=${encodeURIComponent(
    state,
  )}&code=auth-code&scope=${encodeURIComponent(REQUIRED_SCOPES.join(" "))}`;

const prepareGoogleAuthCallbackPage = async (page: Page) => {
  const loginOrSignupRequests: unknown[] = [];

  await page.addInitScript(() => {
    (
      window as Window & { __COMPASS_E2E_TEST__?: boolean }
    ).__COMPASS_E2E_TEST__ = true;
    window.alert = () => undefined;
    window.confirm = () => true;
    window.prompt = () => null;
  });

  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());

    if (url.pathname.endsWith("/api/signinup")) {
      loginOrSignupRequests.push(request.postDataJSON());
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          user: { emails: ["user@example.com"] },
        }),
      });
    }

    if (url.pathname.endsWith("/api/user/metadata")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ google: { connectionState: "HEALTHY" } }),
      });
    }

    if (url.pathname.endsWith("/api/config")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ google: { isConfigured: true } }),
      });
    }

    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({}),
    });
  });

  return { loginOrSignupRequests };
};

test("finishes a saved Google sign-in callback", async ({ page }) => {
  const state = "sign-in-state";
  const apiMocks = await prepareGoogleAuthCallbackPage(page);

  await page.goto("/week");
  await page.evaluate(
    ({ key, value }) => {
      sessionStorage.setItem(key, JSON.stringify(value));
    },
    {
      key: getIntentStorageKey(state),
      value: {
        intent: "signIn",
        returnPath: "/week",
        createdAt: Date.now(),
      },
    },
  );

  await page.goto(getCallbackUrl(state));

  await expect(
    page.locator('[role="status"][aria-busy="true"][aria-live="polite"]'),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/week\/\d{4}-\d{2}-\d{2}$/);
  expect(apiMocks.loginOrSignupRequests).toHaveLength(1);
  expect(
    await page.evaluate(
      (key) => sessionStorage.getItem(key),
      getIntentStorageKey(state),
    ),
  ).toBeNull();
});
