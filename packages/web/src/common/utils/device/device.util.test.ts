import {
  mockLinuxUserAgent,
  mockMacOSUserAgent,
  mockUserAgent,
  mockWindowsUserAgent,
} from "@web/__tests__/__mocks__/mock.setup";
import { DesktopOS, getDesktopOS } from "@web/common/utils/device/device.util";

describe("device.util", () => {
  beforeEach(() => jest.restoreAllMocks());

  describe("getDesktopOS", () => {
    it("should return Windows for Windows user agent", () => {
      mockWindowsUserAgent();
      expect(getDesktopOS()).toBe(DesktopOS.Windows);
    });

    it("should return MacOS for Mac user agent", () => {
      mockMacOSUserAgent();
      expect(getDesktopOS()).toBe(DesktopOS.MacOS);
    });

    it("should return Linux for Linux user agent", () => {
      mockLinuxUserAgent();
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
      mockWindowsUserAgent();
      expect(getDesktopOS()).toBe(DesktopOS.Windows);
    });

    it("should prioritize MacOS over Linux", () => {
      mockMacOSUserAgent();
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
