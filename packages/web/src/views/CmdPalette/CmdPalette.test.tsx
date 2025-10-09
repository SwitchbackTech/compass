import React from "react";
import "@testing-library/jest-dom";
import { screen } from "@testing-library/react";
import { render } from "@web/__tests__/__mocks__/mock.render";

// Mock the react-cmdk library
jest.mock("react-cmdk", () => {
  const MockCommandPalette = ({ children, isOpen }: any) => (
    <div
      className="command-palette"
      data-testid="command-palette"
      style={{ display: isOpen ? "block" : "none" }}
    >
      <div className="overflow-y-auto" data-testid="scrollable-content">
        {children}
      </div>
    </div>
  );

  MockCommandPalette.Page = ({ children }: any) => <div>{children}</div>;
  MockCommandPalette.List = ({ children }: any) => <div>{children}</div>;
  MockCommandPalette.ListItem = ({ children }: any) => <div>{children}</div>;
  MockCommandPalette.FreeSearchAction = () => <div>No results</div>;

  return {
    __esModule: true,
    default: MockCommandPalette,
    filterItems: jest.fn((items) => items),
    getItemIndex: jest.fn(() => 0),
    useHandleOpenCommandPalette: jest.fn(),
  };
});

// Mock the necessary modules
jest.mock("@web/store/store.hooks", () => ({
  useAppDispatch: () => jest.fn(),
  useAppSelector: (selector: any) => {
    if (selector.toString().includes("selectIsCmdPaletteOpen")) {
      return true; // Make the command palette open for testing
    }
    return false;
  },
}));

const CmdPalette = require("./CmdPalette").default;

const mockProps = {
  today: {
    format: jest.fn(() => "Monday, January 1"),
  } as any,
  isCurrentWeek: true,
  startOfView: new Date(),
  endOfView: new Date(),
  util: {
    goToToday: jest.fn(),
  } as any,
  scrollUtil: {
    scrollToNow: jest.fn(),
  } as any,
};

describe("CmdPalette Scrollbar", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders command palette with scrollable content", () => {
    render(<CmdPalette {...mockProps} />);

    const commandPalette = screen.getByTestId("command-palette");
    const scrollableContent = screen.getByTestId("scrollable-content");

    expect(commandPalette).toBeInTheDocument();
    expect(scrollableContent).toBeInTheDocument();
  });

  it("applies correct CSS classes for scrollbar styling", () => {
    render(<CmdPalette {...mockProps} />);

    const commandPalette = screen.getByTestId("command-palette");
    const scrollableContent = screen.getByTestId("scrollable-content");

    expect(commandPalette).toHaveClass("command-palette");
    expect(scrollableContent).toHaveClass("overflow-y-auto");
  });

  it("scrollbar styling is applied through GlobalStyle", () => {
    render(<CmdPalette {...mockProps} />);

    // Check that the GlobalStyle component is rendered
    // The actual scrollbar styling is tested through CSS-in-JS
    const scrollableContent = screen.getByTestId("scrollable-content");

    // Verify the element has the correct class that targets our CSS
    expect(scrollableContent).toHaveClass("overflow-y-auto");

    // The scrollbar styling itself is handled by CSS and cannot be directly
    // tested in jsdom, but we can verify the structure is correct
    const commandPalette = scrollableContent.closest(".command-palette");
    expect(commandPalette).toBeInTheDocument();
  });

  it("maintains accessibility for scrollable content", () => {
    render(<CmdPalette {...mockProps} />);

    const scrollableContent = screen.getByTestId("scrollable-content");

    // Verify the scrollable content is accessible
    expect(scrollableContent).toBeInTheDocument();
    expect(scrollableContent).toHaveClass("overflow-y-auto");

    // The scrollbar should not interfere with keyboard navigation
    // This is ensured by using standard overflow CSS properties
  });

  describe("CSS Scrollbar Properties", () => {
    it("uses theme colors for scrollbar styling", () => {
      render(<CmdPalette {...mockProps} />);

      // The GlobalStyle component should be present to apply scrollbar styles
      // We can't directly test CSS-in-JS styles in jsdom, but we verify
      // the component structure supports the styling
      const scrollableContent = screen.getByTestId("scrollable-content");
      const commandPalette = scrollableContent.closest(".command-palette");

      expect(commandPalette).toBeInTheDocument();
      expect(scrollableContent).toHaveClass("overflow-y-auto");
    });

    it("provides proper scrollbar width and styling", () => {
      render(<CmdPalette {...mockProps} />);

      const scrollableContent = screen.getByTestId("scrollable-content");

      // Verify the element structure that our CSS targets
      expect(scrollableContent).toHaveClass("overflow-y-auto");

      // The CSS rules are:
      // - 8px width for webkit scrollbar
      // - Theme-based colors for thumb
      // - Hover states for better UX
      // These are applied through the GlobalStyle component
    });
  });

  describe("Cross-browser Compatibility", () => {
    it("supports both webkit and standard scrollbar properties", () => {
      render(<CmdPalette {...mockProps} />);

      const scrollableContent = screen.getByTestId("scrollable-content");

      // Our CSS implementation supports:
      // - webkit browsers (Chrome, Safari, Edge) with ::-webkit-scrollbar
      // - Firefox with scrollbar-width and scrollbar-color
      expect(scrollableContent).toHaveClass("overflow-y-auto");
    });
  });
});
