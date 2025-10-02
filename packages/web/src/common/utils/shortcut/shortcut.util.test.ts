import "@testing-library/jest-dom";
import { screen } from "@testing-library/react";
import { render } from "@web/__tests__/__mocks__/mock.render";
import { DesktopOS } from "@web/common/utils/device/device.util";
import { getMetaKey } from "./shortcut.util";

// Mock the device utility
jest.mock("@web/common/utils/device/device.util", () => ({
  DesktopOS: {
    Linux: "linux",
    MacOS: "mac_os",
    Windows: "windows",
    Unknown: "unknown",
  },
  getDesktopOS: jest.fn(),
}));

// Mock Phosphor icons with specific test IDs
jest.mock("@phosphor-icons/react", () => ({
  Command: ({ size, ...props }: any) => {
    const React = require("react");
    return React.createElement(
      "svg",
      {
        "data-testid": "command-icon",
        width: size,
        height: size,
        ...props,
      },
      React.createElement("title", null, "Command"),
    );
  },
  WindowsLogo: ({ size, ...props }: any) => {
    const React = require("react");
    return React.createElement(
      "svg",
      {
        "data-testid": "windows-logo-icon",
        width: size,
        height: size,
        ...props,
      },
      React.createElement("title", null, "Windows Logo"),
    );
  },
}));

const mockGetDesktopOS =
  require("@web/common/utils/device/device.util").getDesktopOS;

describe("shortcut.util", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getMetaKey", () => {
    it("should return Command icon for macOS", () => {
      mockGetDesktopOS.mockReturnValue(DesktopOS.MacOS);

      render(getMetaKey());
      const commandIcon = screen.getByTestId("command-icon");

      expect(mockGetDesktopOS).toHaveBeenCalled();
      expect(commandIcon).toBeInTheDocument();
    });

    it("should return WindowsLogo icon for Windows", () => {
      mockGetDesktopOS.mockReturnValue(DesktopOS.Windows);

      render(getMetaKey());
      const windowsIcon = screen.getByTestId("windows-logo-icon");

      expect(mockGetDesktopOS).toHaveBeenCalled();
      expect(windowsIcon).toBeInTheDocument();
    });

    it("should return WindowsLogo icon for Linux", () => {
      mockGetDesktopOS.mockReturnValue(DesktopOS.Linux);

      render(getMetaKey());
      const windowsIcon = screen.getByTestId("windows-logo-icon");

      expect(mockGetDesktopOS).toHaveBeenCalled();
      expect(windowsIcon).toBeInTheDocument();
    });

    it("should return WindowsLogo icon for Unknown OS", () => {
      mockGetDesktopOS.mockReturnValue(DesktopOS.Unknown);

      render(getMetaKey());
      const windowsIcon = screen.getByTestId("windows-logo-icon");

      expect(mockGetDesktopOS).toHaveBeenCalled();
      expect(windowsIcon).toBeInTheDocument();
    });

    it("should return WindowsLogo icon when getDesktopOS returns undefined", () => {
      mockGetDesktopOS.mockReturnValue(undefined);

      render(getMetaKey());
      const windowsIcon = screen.getByTestId("windows-logo-icon");

      expect(mockGetDesktopOS).toHaveBeenCalled();
      expect(windowsIcon).toBeInTheDocument();
    });

    it("should pass size prop to Command icon on macOS", () => {
      mockGetDesktopOS.mockReturnValue(DesktopOS.MacOS);
      const size = 20;

      render(getMetaKey({ size }));
      const commandIcon = screen.getByTestId("command-icon");

      expect(commandIcon).toBeInTheDocument();
      // The size prop should be passed to the Command component
      expect(commandIcon).toHaveAttribute("width", size.toString());
      expect(commandIcon).toHaveAttribute("height", size.toString());
    });

    it("should pass size prop to WindowsLogo icon on Windows", () => {
      mockGetDesktopOS.mockReturnValue(DesktopOS.Windows);
      const size = 16;

      render(getMetaKey({ size }));
      const windowsIcon = screen.getByTestId("windows-logo-icon");

      expect(windowsIcon).toBeInTheDocument();
      // The size prop should be passed to the WindowsLogo component
      expect(windowsIcon).toHaveAttribute("width", size.toString());
      expect(windowsIcon).toHaveAttribute("height", size.toString());
    });

    it("should use default size of 14 when no size is provided", () => {
      mockGetDesktopOS.mockReturnValue(DesktopOS.MacOS);

      render(getMetaKey());
      const commandIcon = screen.getByTestId("command-icon");

      expect(commandIcon).toBeInTheDocument();
      expect(commandIcon).toHaveAttribute("width", "14");
      expect(commandIcon).toHaveAttribute("height", "14");
    });

    it("should use default size of 14 when empty object is provided", () => {
      mockGetDesktopOS.mockReturnValue(DesktopOS.MacOS);

      render(getMetaKey({}));
      const commandIcon = screen.getByTestId("command-icon");

      expect(commandIcon).toBeInTheDocument();
      expect(commandIcon).toHaveAttribute("width", "14");
      expect(commandIcon).toHaveAttribute("height", "14");
    });
  });
});
