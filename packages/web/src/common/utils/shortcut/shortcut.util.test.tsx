import { beforeEach, describe, expect, it, mock } from "bun:test";
import "@testing-library/jest-dom";
import { screen } from "@testing-library/react";
import { render } from "@web/__tests__/__mocks__/mock.render";
import { mockNavigatorPlatform } from "@web/__tests__/utils/navigator.test.util";
import {
  expandModInShortcutDisplay,
  getMetaKeyIcon,
  getModifierKeyIcon,
  getModifierKeyTestId,
  ShortCutLabel,
} from "@web/common/utils/shortcut/shortcut.util";

describe("shortcut.util", () => {
  beforeEach(() => {
    mock.restore();
  });

  describe("expandModInShortcutDisplay", () => {
    it("resolves Mod to Meta on macOS", () => {
      mockNavigatorPlatform("mac");

      expect(expandModInShortcutDisplay("Mod+k")).toBe("Meta+k");
    });

    it("resolves Mod to Control on Windows", () => {
      mockNavigatorPlatform("windows");

      expect(expandModInShortcutDisplay("Mod+k")).toBe("Control+k");
    });

    it("resolves Mod to Control on Linux", () => {
      mockNavigatorPlatform("linux");

      expect(expandModInShortcutDisplay("Mod+k")).toBe("Control+k");
    });

    it("matches Mod case-insensitively and preserves other segment casing", () => {
      mockNavigatorPlatform("mac");

      expect(expandModInShortcutDisplay("mod+K")).toBe("Meta+K");
      expect(expandModInShortcutDisplay("MOD+k")).toBe("Meta+k");
    });

    it("trims segments and leaves non-Mod keys unchanged", () => {
      mockNavigatorPlatform("windows");

      expect(expandModInShortcutDisplay(" Mod + Shift + a ")).toBe(
        "Control+Shift+a",
      );
    });

    it("does not replace substrings that are not the Mod token", () => {
      mockNavigatorPlatform("mac");

      expect(expandModInShortcutDisplay("Mode+k")).toBe("Mode+k");
    });
  });

  describe("getModifierKeyIcon", () => {
    it("should return Command icon for macOS", () => {
      mockNavigatorPlatform("mac");

      render(getModifierKeyIcon());
      const commandIcon = screen.getByTestId("meta-icon");

      expect(commandIcon).toBeInTheDocument();
    });

    it("should return Control icon for Windows", () => {
      mockNavigatorPlatform("windows");

      render(getModifierKeyIcon());
      const windowsIcon = screen.getByTestId("control-icon");

      expect(windowsIcon).toBeInTheDocument();
    });

    it("should return Control icon for Linux", () => {
      mockNavigatorPlatform("linux");

      render(getModifierKeyIcon());
      const windowsIcon = screen.getByTestId("control-icon");

      expect(windowsIcon).toBeInTheDocument();
    });

    it("should pass size prop to Command icon on macOS", () => {
      mockNavigatorPlatform("mac");
      const size = 20;

      render(getModifierKeyIcon({ size }));
      const commandIcon = screen.getByTestId("meta-icon");

      expect(commandIcon).toBeInTheDocument();
      expect(commandIcon).toHaveAttribute("width", size.toString());
      expect(commandIcon).toHaveAttribute("height", size.toString());
    });

    it("should pass size prop to Control icon on Windows", () => {
      mockNavigatorPlatform("windows");
      const size = 16;

      render(getModifierKeyIcon({ size }));
      const windowsIcon = screen.getByTestId("control-icon");

      expect(windowsIcon).toBeInTheDocument();
      expect(windowsIcon).toHaveAttribute("width", size.toString());
      expect(windowsIcon).toHaveAttribute("height", size.toString());
    });

    it("should use default size of 14 when no size is provided", () => {
      mockNavigatorPlatform("mac");

      render(getModifierKeyIcon());
      const commandIcon = screen.getByTestId("meta-icon");

      expect(commandIcon).toBeInTheDocument();
      expect(commandIcon).toHaveAttribute("width", "14");
      expect(commandIcon).toHaveAttribute("height", "14");
    });

    it("should use default size of 14 when empty object is provided", () => {
      mockNavigatorPlatform("mac");

      render(getModifierKeyIcon({}));
      const commandIcon = screen.getByTestId("meta-icon");

      expect(commandIcon).toBeInTheDocument();
      expect(commandIcon).toHaveAttribute("width", "14");
      expect(commandIcon).toHaveAttribute("height", "14");
    });
  });

  describe("getMetaKeyIcon", () => {
    it("renders Command icon on macOS", () => {
      mockNavigatorPlatform("mac");

      render(getMetaKeyIcon());
      expect(screen.getByTestId("mac-icon")).toBeInTheDocument();
    });

    it("renders Windows logo icon on Windows", () => {
      mockNavigatorPlatform("windows");

      render(getMetaKeyIcon());
      expect(screen.getByTestId("windows-icon")).toBeInTheDocument();
    });

    it("renders Windows logo icon on Linux", () => {
      mockNavigatorPlatform("linux");

      render(getMetaKeyIcon());
      expect(screen.getByTestId("linux-icon")).toBeInTheDocument();
    });
  });

  describe("getModifierKeyTestId", () => {
    it("should return 'meta-icon' for macOS", () => {
      mockNavigatorPlatform("mac");

      expect(getModifierKeyTestId()).toBe("meta-icon");
    });

    it("should return 'control-icon' for Windows", () => {
      mockNavigatorPlatform("windows");

      expect(getModifierKeyTestId()).toBe("control-icon");
    });

    it("should return 'control-icon' for Linux", () => {
      mockNavigatorPlatform("linux");

      expect(getModifierKeyTestId()).toBe("control-icon");
    });
  });

  describe("ShortCutLabel", () => {
    it("should render single key label", () => {
      render(<ShortCutLabel k="a" />);

      expect(screen.getByTestId("a-icon")).toBeInTheDocument();
      expect(screen.getByText("a")).toBeInTheDocument();
    });

    it("should resolve Mod to Meta on macOS", () => {
      mockNavigatorPlatform("mac");

      render(<ShortCutLabel k="Mod+k" />);

      expect(screen.getByTestId("meta-icon")).toBeInTheDocument();
      expect(screen.getByTestId("k-icon")).toBeInTheDocument();
      expect(screen.getByText("k")).toBeInTheDocument();
    });

    it("should resolve Mod to Control on Windows", () => {
      mockNavigatorPlatform("windows");

      render(<ShortCutLabel k="Mod+k" />);

      expect(screen.getByTestId("control-icon")).toBeInTheDocument();
      expect(screen.getByTestId("k-icon")).toBeInTheDocument();
    });

    it("should render multi-key combination with + (canonical modifiers)", () => {
      mockNavigatorPlatform("mac");

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
      mockNavigatorPlatform("windows");

      render(<ShortCutLabel k="Control+Alt+Delete" />);

      expect(screen.getByTestId("control-icon")).toBeInTheDocument();
      expect(screen.getByText("Alt")).toBeInTheDocument();
      expect(screen.getByText("Delete")).toBeInTheDocument();
    });

    it("should handle arrow key combinations", () => {
      mockNavigatorPlatform("mac");

      render(<ShortCutLabel k="Meta+ArrowRight" />);

      expect(screen.getByTestId("meta-icon")).toBeInTheDocument();
      expect(screen.getByText("ArrowRight")).toBeInTheDocument();
    });
  });
});
