/** Overrides navigator fields so TanStack Hotkeys' `detectPlatform` matches the OS. */
export function mockNavigatorPlatform(platform: "mac" | "windows" | "linux") {
  const config = {
    mac: {
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
      platform: "MacIntel",
    },
    windows: {
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      platform: "Win32",
    },
    linux: {
      userAgent: "Mozilla/5.0 (X11; Linux x86_64)",
      platform: "Linux x86_64",
    },
  } as const;

  const { userAgent, platform: plat } = config[platform];

  Object.defineProperty(window.navigator, "userAgent", {
    value: userAgent,
    configurable: true,
    writable: true,
  });
  Object.defineProperty(window.navigator, "platform", {
    value: plat,
    configurable: true,
    writable: true,
  });
}
