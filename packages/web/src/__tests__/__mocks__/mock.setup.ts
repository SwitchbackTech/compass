import { mockModule } from "@core/__tests__/mock.setup";
import { createElement } from "react";

export function mockUserAgent(userAgent: string) {
  return jest
    .spyOn(window.navigator, "userAgent", "get")
    .mockReturnValue(userAgent);
}

function mockNavigatorPlatformValue(platform: string) {
  return jest
    .spyOn(window.navigator, "platform", "get")
    .mockReturnValue(platform);
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
    useGoogleLogin: jest.fn().mockReturnValue({
      login: jest.fn(),
      loading: false,
    }),
  }));
}

export function mockSuperTokens() {
  mockModule(
    "supertokens-web-js/recipe/session",
    (session: typeof import("supertokens-web-js/recipe/session")) => {
      const defaultSession = {
        doesSessionExist: jest.fn().mockResolvedValue(true),
        getUserId: jest.fn().mockResolvedValue("mock-user-id"),
        signOut: jest.fn().mockResolvedValue(undefined),
        getAccessToken: jest.fn().mockResolvedValue("mock-access-token"),
        validateClaims: jest.fn().mockResolvedValue([]),
        getClaimValue: jest.fn(),
        PrimitiveClaim: jest.fn(),
        BooleanClaim: jest.fn(),
        PrimitiveArrayClaim: jest.fn(),
        attemptRefreshingSession: jest.fn().mockResolvedValue(true),
        getInvalidClaimsFromResponse: jest.fn().mockResolvedValue([]),
        getAccessTokenPayloadSecurely: jest
          .fn()
          .mockResolvedValue({ mockKey: "mockValue" }),
      };

      return {
        ...defaultSession,
        default: Object.assign({}, session.default, defaultSession),
      };
    },
  );
}

function mockReactToastify() {
  jest.mock("react-toastify", () => {
    const actual =
      jest.requireActual<typeof import("react-toastify")>("react-toastify");
    const baseToast = actual.toast;
    const toastFn = jest
      .fn()
      .mockReturnValue("mock-toast-id") as typeof baseToast &
      jest.MockedFunction<typeof baseToast>;

    toastFn.POSITION = baseToast.POSITION;
    toastFn.TYPE = baseToast.TYPE;
    toastFn.dismiss = jest.fn();
    toastFn.error = jest.fn();
    toastFn.info = jest.fn();
    toastFn.isActive = jest.fn();
    toastFn.success = jest.fn();
    toastFn.update = jest.fn();
    toastFn.warning = jest.fn();
    toastFn.warn = jest.fn();
    toastFn.loading = jest.fn();
    toastFn.promise = jest.fn();
    toastFn.dark = jest.fn();
    toastFn.done = jest.fn();
    toastFn.onChange = jest.fn();
    toastFn.clearWaitingQueue = jest.fn();

    return {
      ...actual,
      default: toastFn,
      toast: toastFn,
    };
  });
}

function mockPhosphorIcons() {
  mockModule("@phosphor-icons/react", () => {
    return {
      Command: ({ size, ...props }: { size: number }) => {
        return createElement(
          "svg",
          {
            "data-testid": "command-icon",
            width: size,
            height: size,
            ...props,
          },
          createElement("title", null, "Command"),
        );
      },
      WindowsLogo: ({ size, ...props }: { size: number }) => {
        return createElement(
          "svg",
          {
            "data-testid": "windows-logo-icon",
            width: size,
            height: size,
            ...props,
          },
          createElement("title", null, "Windows Logo"),
        );
      },
    };
  });
}

export function mockNodeModules() {
  mockUseGoogleLogin();
  mockSuperTokens();
  mockReactToastify();
  mockPhosphorIcons();
}
