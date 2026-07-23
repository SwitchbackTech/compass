import { mock } from "bun:test";

type RestorableMock = {
  mockRestore: () => void;
};

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
