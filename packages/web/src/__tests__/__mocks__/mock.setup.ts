import * as actualReactToastify from "react-toastify";
import { mock } from "bun:test";

type RestorableMock = {
  mockRestore: () => void;
};

type MockFn = ReturnType<typeof mock>;

function mockModule<T>(mockPath: string, mockFactory: () => T) {
  mock.module(mockPath, mockFactory);
}

function mockNavigatorReadonlyValue(
  key: "platform" | "userAgent",
  value: string,
): RestorableMock {
  const originalDescriptor =
    Object.getOwnPropertyDescriptor(window.navigator, key) ??
    Object.getOwnPropertyDescriptor(
      Object.getPrototypeOf(window.navigator),
      key,
    );

  Object.defineProperty(window.navigator, key, {
    configurable: true,
    get: () => value,
  });

  return {
    mockRestore: () => {
      if (originalDescriptor) {
        Object.defineProperty(window.navigator, key, originalDescriptor);
        return;
      }

      delete (window.navigator as Record<string, unknown>)[key];
    },
  };
}

export function mockUserAgent(userAgent: string) {
  return mockNavigatorReadonlyValue("userAgent", userAgent);
}

function mockNavigatorPlatformValue(platform: string) {
  return mockNavigatorReadonlyValue("platform", platform);
}

/**
 * Mocks UA + `navigator.platform` so TanStack Hotkeys' `detectPlatform()` matches the OS
 * (it checks both; jsdom's default platform can confuse macOS detection).
 */
export function mockWindowsUserAgent() {
  const uaSpy = mockUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  );
  const platformSpy = mockNavigatorPlatformValue("Win32");
  const originalUaRestore = uaSpy.mockRestore.bind(uaSpy);
  uaSpy.mockRestore = () => {
    platformSpy.mockRestore();
    originalUaRestore();
  };
  return uaSpy;
}

export function mockMacOSUserAgent() {
  const uaSpy = mockUserAgent(
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
  );
  const platformSpy = mockNavigatorPlatformValue("MacIntel");
  const originalUaRestore = uaSpy.mockRestore.bind(uaSpy);
  uaSpy.mockRestore = () => {
    platformSpy.mockRestore();
    originalUaRestore();
  };
  return uaSpy;
}

export function mockLinuxUserAgent() {
  const uaSpy = mockUserAgent(
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36",
  );
  const platformSpy = mockNavigatorPlatformValue("Linux x86_64");
  const originalUaRestore = uaSpy.mockRestore.bind(uaSpy);
  uaSpy.mockRestore = () => {
    platformSpy.mockRestore();
    originalUaRestore();
  };
  return uaSpy;
}

export function mockUseGoogleLogin() {
  mockModule("@web/auth/google/hooks/useGoogleLogin/useGoogleLogin", () => ({
    useGoogleLogin: mock(() => ({
      login: mock(),
      loading: false,
    })),
  }));
}

export function mockSuperTokens() {
  const defaultSession = {
    init: mock(() => ({})),
    doesSessionExist: mock().mockResolvedValue(true),
    getUserId: mock().mockResolvedValue("mock-user-id"),
    signOut: mock().mockResolvedValue(undefined),
    getAccessToken: mock().mockResolvedValue("mock-access-token"),
    validateClaims: mock().mockResolvedValue([]),
    getClaimValue: mock(),
    PrimitiveClaim: mock(),
    BooleanClaim: mock(),
    PrimitiveArrayClaim: mock(),
    attemptRefreshingSession: mock().mockResolvedValue(true),
    getInvalidClaimsFromResponse: mock().mockResolvedValue([]),
    getAccessTokenPayloadSecurely: mock().mockResolvedValue({
      mockKey: "mockValue",
    }),
  };

  mockModule("supertokens-web-js/recipe/session", () => ({
    default: defaultSession,
    ...defaultSession,
  }));

  const mockRecipe = () => {
    const recipe = {
      init: mock(() => ({})),
    };

    return {
      default: recipe,
      ...recipe,
    };
  };

  mockModule("supertokens-web-js", () => ({
    default: { init: mock(() => ({})) },
    init: mock(() => ({})),
  }));
  mockModule("supertokens-web-js/recipe/emailpassword", mockRecipe);
  mockModule("supertokens-web-js/recipe/emailverification", mockRecipe);
  mockModule("supertokens-web-js/recipe/thirdparty", mockRecipe);
}

function mockReactToastify() {
  const toastFn = mock(
    () => "mock-toast-id",
  ) as typeof actualReactToastify.toast & MockFn;

  toastFn.POSITION = actualReactToastify.toast.POSITION;
  toastFn.TYPE = actualReactToastify.toast.TYPE;
  toastFn.dismiss = mock();
  toastFn.error = mock();
  toastFn.info = mock();
  toastFn.isActive = mock();
  toastFn.success = mock();
  toastFn.update = mock();
  toastFn.warning = mock();
  toastFn.warn = mock();
  toastFn.loading = mock();
  toastFn.promise = mock();
  toastFn.dark = mock();
  toastFn.done = mock();
  toastFn.onChange = mock();
  toastFn.clearWaitingQueue = mock();

  mockModule("react-toastify", () => {
    return {
      ...actualReactToastify,
      default: toastFn,
      toast: toastFn,
    };
  });
}

export function mockNodeModules() {
  mockUseGoogleLogin();
  mockSuperTokens();
  mockReactToastify();
}
