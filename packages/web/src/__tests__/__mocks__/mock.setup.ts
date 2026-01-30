import { createElement } from "react";
import { mockModule } from "@core/__tests__/mock.setup";

export function mockUserAgent(userAgent: string) {
  return jest
    .spyOn(window.navigator, "userAgent", "get")
    .mockReturnValue(userAgent);
}

export function mockWindowsUserAgent() {
  return mockUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  );
}

export function mockMacOSUserAgent() {
  return mockUserAgent(
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
  );
}

export function mockLinuxUserAgent() {
  return mockUserAgent("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36");
}

export function mockUseGoogleLogin() {
  mockModule("@web/components/oauth/google/useGoogleLogin", () => ({
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
  mockModule("react-toastify", () => {
    return jest.createMockFromModule("react-toastify");
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
