import "@testing-library/jest-dom";
import { screen } from "@testing-library/react";
import { render } from "@web/__tests__/__mocks__/mock.render";
import * as deviceUtil from "@web/common/utils/device/device.util";
import { getMetaKey } from "@web/common/utils/shortcut/shortcut.util";

describe("shortcut.util", () => {
  const DesktopOS = deviceUtil.DesktopOS;
  const getDesktopOSSpy = jest.spyOn(deviceUtil, "getDesktopOS");

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getMetaKey", () => {
    it("should return Command icon for macOS", () => {
      getDesktopOSSpy.mockReturnValue(DesktopOS.MacOS);

      render(getMetaKey());
      const commandIcon = screen.getByTestId("macos-meta-icon");

      expect(getDesktopOSSpy).toHaveBeenCalled();
      expect(commandIcon).toBeInTheDocument();
    });

    it("should return WindowsLogo icon for Windows", () => {
      getDesktopOSSpy.mockReturnValue(DesktopOS.Windows);

      render(getMetaKey());
      const windowsIcon = screen.getByTestId("windows-meta-icon");

      expect(getDesktopOSSpy).toHaveBeenCalled();
      expect(windowsIcon).toBeInTheDocument();
    });

    it("should return WindowsLogo icon for Linux", () => {
      getDesktopOSSpy.mockReturnValue(DesktopOS.Linux);

      render(getMetaKey());
      const windowsIcon = screen.getByTestId("windows-meta-icon");

      expect(getDesktopOSSpy).toHaveBeenCalled();
      expect(windowsIcon).toBeInTheDocument();
    });

    it("should return WindowsLogo icon for Unknown OS", () => {
      getDesktopOSSpy.mockReturnValue(DesktopOS.Unknown);

      render(getMetaKey());
      const windowsIcon = screen.getByTestId("windows-meta-icon");

      expect(getDesktopOSSpy).toHaveBeenCalled();
      expect(windowsIcon).toBeInTheDocument();
    });

    it("should return WindowsLogo icon when getDesktopOS returns undefined", () => {
      getDesktopOSSpy.mockReturnValue(undefined);

      render(getMetaKey());
      const windowsIcon = screen.getByTestId("windows-meta-icon");

      expect(getDesktopOSSpy).toHaveBeenCalled();
      expect(windowsIcon).toBeInTheDocument();
    });

    it("should pass size prop to Command icon on macOS", () => {
      getDesktopOSSpy.mockReturnValue(DesktopOS.MacOS);
      const size = 20;

      render(getMetaKey({ size }));
      const commandIcon = screen.getByTestId("macos-meta-icon");

      expect(commandIcon).toBeInTheDocument();
      // The size prop should be passed to the Command component
      expect(commandIcon).toHaveAttribute("width", size.toString());
      expect(commandIcon).toHaveAttribute("height", size.toString());
    });

    it("should pass size prop to WindowsLogo icon on Windows", () => {
      getDesktopOSSpy.mockReturnValue(DesktopOS.Windows);
      const size = 16;

      render(getMetaKey({ size }));
      const windowsIcon = screen.getByTestId("windows-meta-icon");

      expect(windowsIcon).toBeInTheDocument();
      // The size prop should be passed to the WindowsLogo component
      expect(windowsIcon).toHaveAttribute("width", size.toString());
      expect(windowsIcon).toHaveAttribute("height", size.toString());
    });

    it("should use default size of 14 when no size is provided", () => {
      getDesktopOSSpy.mockReturnValue(DesktopOS.MacOS);

      render(getMetaKey());
      const commandIcon = screen.getByTestId("macos-meta-icon");

      expect(commandIcon).toBeInTheDocument();
      expect(commandIcon).toHaveAttribute("width", "14");
      expect(commandIcon).toHaveAttribute("height", "14");
    });

    it("should use default size of 14 when empty object is provided", () => {
      getDesktopOSSpy.mockReturnValue(DesktopOS.MacOS);

      render(getMetaKey({}));
      const commandIcon = screen.getByTestId("macos-meta-icon");

      expect(commandIcon).toBeInTheDocument();
      expect(commandIcon).toHaveAttribute("width", "14");
      expect(commandIcon).toHaveAttribute("height", "14");
    });
  });
});
