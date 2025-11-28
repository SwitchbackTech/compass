import "@testing-library/jest-dom";
import { screen } from "@testing-library/react";
import { render } from "@web/__tests__/__mocks__/mock.render";
import * as deviceUtil from "@web/common/utils/device/device.util";
import {
  ShortCutLabel,
  getModifierKey,
  getModifierKeyIcon,
  getModifierKeyTestId,
} from "@web/common/utils/shortcut/shortcut.util";

describe("shortcut.util", () => {
  const DesktopOS = deviceUtil.DesktopOS;
  const getDesktopOSSpy = jest.spyOn(deviceUtil, "getDesktopOS");

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getModifierKeyIcon", () => {
    it("should return Command icon for macOS", () => {
      getDesktopOSSpy.mockReturnValue(DesktopOS.MacOS);

      render(getModifierKeyIcon());
      const commandIcon = screen.getByTestId("meta-icon");

      expect(getDesktopOSSpy).toHaveBeenCalled();
      expect(commandIcon).toBeInTheDocument();
    });

    it("should return Control icon for Windows", () => {
      getDesktopOSSpy.mockReturnValue(DesktopOS.Windows);

      render(getModifierKeyIcon());
      const windowsIcon = screen.getByTestId("control-icon");

      expect(getDesktopOSSpy).toHaveBeenCalled();
      expect(windowsIcon).toBeInTheDocument();
    });

    it("should return Control icon for Linux", () => {
      getDesktopOSSpy.mockReturnValue(DesktopOS.Linux);

      render(getModifierKeyIcon());
      const windowsIcon = screen.getByTestId("control-icon");

      expect(getDesktopOSSpy).toHaveBeenCalled();
      expect(windowsIcon).toBeInTheDocument();
    });

    it("should return Control icon for Unknown OS", () => {
      getDesktopOSSpy.mockReturnValue(DesktopOS.Unknown);

      render(getModifierKeyIcon());
      const windowsIcon = screen.getByTestId("control-icon");

      expect(getDesktopOSSpy).toHaveBeenCalled();
      expect(windowsIcon).toBeInTheDocument();
    });

    it("should return Control icon when getDesktopOS returns undefined", () => {
      getDesktopOSSpy.mockReturnValue(undefined);

      render(getModifierKeyIcon());
      const windowsIcon = screen.getByTestId("control-icon");

      expect(getDesktopOSSpy).toHaveBeenCalled();
      expect(windowsIcon).toBeInTheDocument();
    });

    it("should pass size prop to Command icon on macOS", () => {
      getDesktopOSSpy.mockReturnValue(DesktopOS.MacOS);
      const size = 20;

      render(getModifierKeyIcon({ size }));
      const commandIcon = screen.getByTestId("meta-icon");

      expect(commandIcon).toBeInTheDocument();
      // The size prop should be passed to the Command component
      expect(commandIcon).toHaveAttribute("width", size.toString());
      expect(commandIcon).toHaveAttribute("height", size.toString());
    });

    it("should pass size prop to Control icon on Windows", () => {
      getDesktopOSSpy.mockReturnValue(DesktopOS.Windows);
      const size = 16;

      render(getModifierKeyIcon({ size }));
      const windowsIcon = screen.getByTestId("control-icon");

      expect(windowsIcon).toBeInTheDocument();
      // The size prop should be passed to the Control component
      expect(windowsIcon).toHaveAttribute("width", size.toString());
      expect(windowsIcon).toHaveAttribute("height", size.toString());
    });

    it("should use default size of 14 when no size is provided", () => {
      getDesktopOSSpy.mockReturnValue(DesktopOS.MacOS);

      render(getModifierKeyIcon());
      const commandIcon = screen.getByTestId("meta-icon");

      expect(commandIcon).toBeInTheDocument();
      expect(commandIcon).toHaveAttribute("width", "14");
      expect(commandIcon).toHaveAttribute("height", "14");
    });

    it("should use default size of 14 when empty object is provided", () => {
      getDesktopOSSpy.mockReturnValue(DesktopOS.MacOS);

      render(getModifierKeyIcon({}));
      const commandIcon = screen.getByTestId("meta-icon");

      expect(commandIcon).toBeInTheDocument();
      expect(commandIcon).toHaveAttribute("width", "14");
      expect(commandIcon).toHaveAttribute("height", "14");
    });
  });

  describe("getModifierKey", () => {
    it("should return 'Meta' for macOS", () => {
      getDesktopOSSpy.mockReturnValue(DesktopOS.MacOS);

      expect(getModifierKey()).toBe("Meta");
    });

    it("should return 'Control' for Windows", () => {
      getDesktopOSSpy.mockReturnValue(DesktopOS.Windows);

      expect(getModifierKey()).toBe("Control");
    });

    it("should return 'Control' for Linux", () => {
      getDesktopOSSpy.mockReturnValue(DesktopOS.Linux);

      expect(getModifierKey()).toBe("Control");
    });

    it("should return 'Control' for Unknown OS", () => {
      getDesktopOSSpy.mockReturnValue(DesktopOS.Unknown);

      expect(getModifierKey()).toBe("Control");
    });

    it("should return 'Control' when getDesktopOS returns undefined", () => {
      getDesktopOSSpy.mockReturnValue(undefined);

      expect(getModifierKey()).toBe("Control");
    });
  });

  describe("getModifierKeyTestId", () => {
    it("should return 'meta-icon' for macOS", () => {
      getDesktopOSSpy.mockReturnValue(DesktopOS.MacOS);

      expect(getModifierKeyTestId()).toBe("meta-icon");
    });

    it("should return 'control-icon' for Windows", () => {
      getDesktopOSSpy.mockReturnValue(DesktopOS.Windows);

      expect(getModifierKeyTestId()).toBe("control-icon");
    });

    it("should return 'control-icon' for Linux", () => {
      getDesktopOSSpy.mockReturnValue(DesktopOS.Linux);

      expect(getModifierKeyTestId()).toBe("control-icon");
    });
  });

  describe("ShortCutLabel", () => {
    it("should render single key label", () => {
      render(<ShortCutLabel k="a" />);

      expect(screen.getByTestId("a-icon")).toBeInTheDocument();
      expect(screen.getByText("a")).toBeInTheDocument();
    });

    it("should render multi-key combination with +", () => {
      getDesktopOSSpy.mockReturnValue(DesktopOS.MacOS);

      render(<ShortCutLabel k="Meta+k" />);

      expect(screen.getByTestId("meta-icon")).toBeInTheDocument();
      expect(screen.getByTestId("k-icon")).toBeInTheDocument();
      expect(screen.getByText("k")).toBeInTheDocument();
    });

    it("should render Control icon for Control key", () => {
      render(<ShortCutLabel k="Control" />);

      expect(screen.getByTestId("control-icon")).toBeInTheDocument();
    });

    it("should render Meta icon for Meta key", () => {
      render(<ShortCutLabel k="Meta" />);

      expect(screen.getByTestId("meta-icon")).toBeInTheDocument();
    });

    it("should handle keys with spaces in combination", () => {
      render(<ShortCutLabel k="Control + Shift + a" />);

      expect(screen.getByTestId("control-icon")).toBeInTheDocument();
      expect(screen.getByText("Shift")).toBeInTheDocument();
      expect(screen.getByText("a")).toBeInTheDocument();
    });

    it("should apply custom size to icon components", () => {
      const customSize = 20;
      render(<ShortCutLabel k="Meta" size={customSize} />);

      const icon = screen.getByTestId("meta-icon");
      expect(icon).toHaveAttribute("width", customSize.toString());
      expect(icon).toHaveAttribute("height", customSize.toString());
    });

    it("should apply custom size to text spans", () => {
      const customSize = 18;
      render(<ShortCutLabel k="a" size={customSize} />);

      const textSpan = screen.getByText("a");
      expect(textSpan).toHaveStyle(`font-size: ${customSize}px`);
    });

    it("should use default size of 14 when not specified", () => {
      render(<ShortCutLabel k="Meta" />);

      const icon = screen.getByTestId("meta-icon");
      expect(icon).toHaveAttribute("width", "14");
      expect(icon).toHaveAttribute("height", "14");
    });

    it("should render complex shortcuts correctly", () => {
      getDesktopOSSpy.mockReturnValue(DesktopOS.Windows);

      render(<ShortCutLabel k="Control+Alt+Delete" />);

      expect(screen.getByTestId("control-icon")).toBeInTheDocument();
      expect(screen.getByText("Alt")).toBeInTheDocument();
      expect(screen.getByText("Delete")).toBeInTheDocument();
    });

    it("should handle arrow key combinations", () => {
      render(<ShortCutLabel k="Meta+ArrowRight" />);

      expect(screen.getByTestId("meta-icon")).toBeInTheDocument();
      expect(screen.getByText("ArrowRight")).toBeInTheDocument();
    });
  });
});
