import { expect, type Page, test } from "@playwright/test";

const CALLBACK_PATH = "/auth/google/callback";
const INTENT_STORAGE_PREFIX = "compass.googleAuthorizationIntent";
const REQUIRED_SCOPES = [
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/calendar.events",
];

type CapturedAuthRequest = {
  body: unknown;
  headers: Record<string, string>;
};

type ApiMocks = {
  connectGoogle: CapturedAuthRequest[];
  loginOrSignup: CapturedAuthRequest[];
};

type ApiMockOptions = {
  beforeConnectGoogleResponse?: Promise<void>;
  beforeLoginOrSignupResponse?: Promise<void>;
};

const createDeferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });

  return { promise, resolve };
};

const getIntentStorageKey = (state: string) =>
  `${INTENT_STORAGE_PREFIX}.${state}`;

const getCallbackUrl = (state: string, scope = REQUIRED_SCOPES.join(" ")) =>
  `${CALLBACK_PATH}?state=${encodeURIComponent(
    state,
  )}&code=auth-code&scope=${encodeURIComponent(scope)}`;

const expectGoogleAuthRequestBody = (
  request: CapturedAuthRequest | undefined,
  state: string,
) => {
  expect(request?.body).toMatchObject({
    thirdPartyId: "google",
    clientType: "web",
    redirectURIInfo: {
      redirectURIOnProviderDashboard: expect.stringContaining(CALLBACK_PATH),
      redirectURIQueryParams: {
        code: "auth-code",
        state,
      },
    },
  });
};

const writeGoogleAuthorizationIntent = async ({
  intent,
  page,
  returnPath,
  state,
}: {
  intent: "signIn" | "connectCalendar";
  page: Page;
  returnPath: string;
  state: string;
}) => {
  await page.goto("/week");
  await page.evaluate(
    ({ key, value }) => {
      sessionStorage.setItem(key, JSON.stringify(value));
    },
    {
      key: getIntentStorageKey(state),
      value: {
        intent,
        returnPath,
        createdAt: Date.now(),
      },
    },
  );
};

const setActiveCompassSession = async (page: Page) => {
  const now = Date.now();
  const pageOrigin = new URL(page.url()).origin;
  const expires = Math.floor(now / 1000) + 60 * 60;
  const frontToken = Buffer.from(
    JSON.stringify({
      ate: now + 60 * 60 * 1000,
      uid: "test-user-id",
      up: {},
    }),
  ).toString("base64");

  await page.context().addCookies([
    {
      expires,
      name: "st-last-access-token-update",
      url: pageOrigin,
      value: now.toString(),
    },
    {
      expires,
      name: "sFrontToken",
      url: pageOrigin,
      value: frontToken,
    },
  ]);
};

const prepareGoogleAuthCallbackPage = async (
  page: Page,
  options: ApiMockOptions = {},
): Promise<ApiMocks> => {
  const apiMocks: ApiMocks = {
    connectGoogle: [],
    loginOrSignup: [],
  };

  page.on("dialog", async (dialog) => {
    await dialog.dismiss().catch(() => undefined);
  });

  await page.addInitScript(() => {
    window.__COMPASS_E2E_TEST__ = true;
    window.alert = () => undefined;
    window.confirm = () => true;
    window.prompt = () => null;
  });

  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());

    if (url.pathname.endsWith("/api/signinup")) {
      apiMocks.loginOrSignup.push({
        body: request.postDataJSON(),
        headers: request.headers(),
      });
      await options.beforeLoginOrSignupResponse;
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          user: { emails: ["user@example.com"] },
        }),
      });
    }

    if (url.pathname.endsWith("/api/auth/google/connect")) {
      apiMocks.connectGoogle.push({
        body: request.postDataJSON(),
        headers: request.headers(),
      });
      await options.beforeConnectGoogleResponse;
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({}),
      });
    }

    if (url.pathname.includes("/api/session")) {
      return route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ message: "unauthorized" }),
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

  return apiMocks;
};

test.describe("Google auth callback", () => {
  test("shows completion status while finishing a saved Google sign-in intent", async ({
    page,
  }) => {
    const state = "sign-in-state";
    const delayedSignIn = createDeferred();
    const apiMocks = await prepareGoogleAuthCallbackPage(page, {
      beforeLoginOrSignupResponse: delayedSignIn.promise,
    });

    await writeGoogleAuthorizationIntent({
      intent: "signIn",
      page,
      returnPath: "/week",
      state,
    });

    await page.goto(getCallbackUrl(state));

    await expect(
      page.locator('[role="status"][aria-busy="true"][aria-live="polite"]'),
    ).toBeVisible();
    await expect(
      page.getByText("Completing Google authorization..."),
    ).toBeVisible();
    await expect(page.getByText("Returning you to Compass.")).toBeVisible();

    delayedSignIn.resolve();

    await expect(page).toHaveURL(/\/week\/\d{4}-\d{2}-\d{2}$/);
    expect(apiMocks.loginOrSignup).toHaveLength(1);
    expect(apiMocks.connectGoogle).toHaveLength(0);
    expect(apiMocks.loginOrSignup[0]?.headers.rid).toBe("thirdparty");
    expectGoogleAuthRequestBody(apiMocks.loginOrSignup[0], state);
    expect(
      await page.evaluate(
        (key) => sessionStorage.getItem(key),
        getIntentStorageKey(state),
      ),
    ).toBeNull();
  });

  test("finishes a saved Google Calendar connect intent when the Compass session is active", async ({
    page,
  }) => {
    const state = "connect-calendar-state";
    const apiMocks = await prepareGoogleAuthCallbackPage(page);

    await writeGoogleAuthorizationIntent({
      intent: "connectCalendar",
      page,
      returnPath: "/week",
      state,
    });
    await setActiveCompassSession(page);

    await page.goto(getCallbackUrl(state));

    await expect(page).toHaveURL(/\/week\/\d{4}-\d{2}-\d{2}$/);
    expect(apiMocks.loginOrSignup).toHaveLength(0);
    expect(apiMocks.connectGoogle).toHaveLength(1);
    expectGoogleAuthRequestBody(apiMocks.connectGoogle[0], state);
  });

  test("recovers a saved Google Calendar connect intent through Google sign-in when the Compass session is missing", async ({
    page,
  }) => {
    const state = "connect-calendar-session-missing-state";
    const apiMocks = await prepareGoogleAuthCallbackPage(page);

    await writeGoogleAuthorizationIntent({
      intent: "connectCalendar",
      page,
      returnPath: "/week",
      state,
    });

    await page.goto(getCallbackUrl(state));

    await expect(page).toHaveURL(/\/week\/\d{4}-\d{2}-\d{2}$/);
    expect(apiMocks.connectGoogle).toHaveLength(0);
    expect(apiMocks.loginOrSignup).toHaveLength(1);
    expect(apiMocks.loginOrSignup[0]?.headers.rid).toBe("thirdparty");
    expectGoogleAuthRequestBody(apiMocks.loginOrSignup[0], state);
  });

  test("rejects callbacks that are missing required Google Calendar scopes", async ({
    page,
  }) => {
    const state = "missing-scopes-state";
    const apiMocks = await prepareGoogleAuthCallbackPage(page);

    await writeGoogleAuthorizationIntent({
      intent: "signIn",
      page,
      returnPath: "/week",
      state,
    });

    await page.goto(getCallbackUrl(state, REQUIRED_SCOPES[0] ?? ""));

    await expect(page).toHaveURL(/\/week\/\d{4}-\d{2}-\d{2}$/);
    await expect(
      page.getByText(
        "Missing Google Calendar permissions. Please grant all requested permissions.",
      ),
    ).toBeVisible();
    expect(apiMocks.loginOrSignup).toHaveLength(0);
    expect(apiMocks.connectGoogle).toHaveLength(0);
  });

  test("rejects callbacks without a saved intent", async ({ page }) => {
    const apiMocks = await prepareGoogleAuthCallbackPage(page);

    await page.goto(getCallbackUrl("unknown-state"));

    await expect(page).toHaveURL(/\/day(\/|$)/);
    await expect(
      page.getByText(
        "Google authorization could not be completed. Please try again.",
      ),
    ).toBeVisible();
    expect(apiMocks.loginOrSignup).toHaveLength(0);
    expect(apiMocks.connectGoogle).toHaveLength(0);
  });
});
