import { DesktopOS, getDesktopOS } from "./device.util";

// Mock window.navigator.userAgent
const mockUserAgent = (userAgent: string) => {
  Object.defineProperty(window.navigator, "userAgent", {
    writable: true,
    value: userAgent,
  });
};

describe("device.util", () => {
  describe("getDesktopOS", () => {
    it("should return Windows for Windows user agent", () => {
      mockUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      );
      expect(getDesktopOS()).toBe(DesktopOS.Windows);
    });

    it("should return MacOS for Mac user agent", () => {
      mockUserAgent(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      );
      expect(getDesktopOS()).toBe(DesktopOS.MacOS);
    });

    it("should return Linux for Linux user agent", () => {
      mockUserAgent("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36");
      expect(getDesktopOS()).toBe(DesktopOS.Linux);
    });

    it("should return Unknown for unrecognized user agent", () => {
      mockUserAgent("SomeRandomUserAgent");
      expect(getDesktopOS()).toBe(DesktopOS.Unknown);
    });

    it("should return Unknown for empty user agent", () => {
      mockUserAgent("");
      expect(getDesktopOS()).toBe(DesktopOS.Unknown);
    });

    it("should prioritize Windows over other matches", () => {
      mockUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Mac OS X 10_15_7",
      );
      expect(getDesktopOS()).toBe(DesktopOS.Windows);
    });

    it("should prioritize MacOS over Linux", () => {
      mockUserAgent(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Linux x86_64",
      );
      expect(getDesktopOS()).toBe(DesktopOS.MacOS);
    });
  });

  describe("DesktopOS enum", () => {
    it("should have correct values", () => {
      expect(DesktopOS.Linux).toBe("linux");
      expect(DesktopOS.MacOS).toBe("mac_os");
      expect(DesktopOS.Windows).toBe("windows");
      expect(DesktopOS.Unknown).toBe("unknown");
    });
  });
});
