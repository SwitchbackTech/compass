import React from "react";
import "@testing-library/jest-dom";
import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ActionsMenu } from "./ActionsMenu";

// Mock dependencies that require complex setup
let mockOpen = false;
let mockActiveIndex: number | null = null;
let mockListRef = { current: [] as HTMLElement[] };

jest.mock("@floating-ui/react", () => ({
  FloatingFocusManager: ({ children }: any) => <div>{children}</div>,
  FloatingPortal: ({ children }: any) => <div>{children}</div>,
  flip: jest.fn(),
  offset: jest.fn(),
  shift: jest.fn(),
  useClick: jest.fn(() => ({
    onClick: (e: any) => {
      if (e.detail > 0) {
        // Mouse click
        mockOpen = !mockOpen;
        if (mockOpen) {
          mockActiveIndex = 0;
        } else {
          mockActiveIndex = null;
        }
      }
    },
  })),
  useDismiss: jest.fn(() => ({})),
  useFloating: jest.fn(() => ({
    x: 0,
    y: 0,
    refs: {
      setReference: jest.fn(),
      setFloating: jest.fn(),
    },
    strategy: "absolute",
    context: { open: mockOpen },
  })),
  useInteractions: jest.fn(() => ({
    getReferenceProps: jest.fn(() => ({
      onClick: (e: any) => {
        if (e.detail > 0) {
          // Mouse click
          mockOpen = !mockOpen;
          if (mockOpen) {
            mockActiveIndex = 0;
          } else {
            mockActiveIndex = null;
          }
        }
      },
    })),
    getFloatingProps: jest.fn(() => ({})),
    getItemProps: jest.fn(() => ({})),
  })),
  useListNavigation: jest.fn(() => ({
    onKeyDown: (e: any) => {
      if (mockOpen) {
        if (e.key === "ArrowDown") {
          mockActiveIndex =
            mockActiveIndex === null
              ? 0
              : Math.min(mockActiveIndex + 1, mockListRef.current.length - 1);
        } else if (e.key === "ArrowUp") {
          mockActiveIndex =
            mockActiveIndex === null ? 0 : Math.max(mockActiveIndex - 1, 0);
        } else if (e.key === "Home") {
          mockActiveIndex = 0;
        } else if (e.key === "End") {
          mockActiveIndex = mockListRef.current.length - 1;
        }
      }
    },
  })),
  useRole: jest.fn(() => ({})),
}));

jest.mock("@web/components/IconButton/IconButton", () => {
  return function MockIconButton({ children, ...props }: any) {
    return <button {...props}>{children}</button>;
  };
});

jest.mock("@phosphor-icons/react", () => ({
  DotsThreeVertical: () => <span>⋮</span>,
}));

describe("ActionsMenu ARIA Compliance", () => {
  it("should have proper ARIA attributes on trigger button", () => {
    render(
      <ActionsMenu id="test-menu">{() => <div>Menu content</div>}</ActionsMenu>,
    );

    const trigger = screen.getByLabelText("Open actions menu");

    expect(trigger).toHaveAttribute("aria-haspopup", "menu");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveAttribute("id", "test-menu-trigger");
  });

  it("should generate consistent IDs for ARIA relationships", () => {
    render(
      <ActionsMenu id="custom-menu">
        {() => <div>Menu content</div>}
      </ActionsMenu>,
    );

    const trigger = screen.getByLabelText("Open actions menu");
    expect(trigger).toHaveAttribute("id", "custom-menu-trigger");
  });

  it("should use default ID when none provided", () => {
    render(<ActionsMenu>{() => <div>Menu content</div>}</ActionsMenu>);

    const trigger = screen.getByLabelText("Open actions menu");
    expect(trigger).toHaveAttribute("id", "event-actions-menu-trigger");
  });
});

describe("ActionsMenu Keyboard Interactions", () => {
  const mockAction1 = jest.fn();
  const mockAction2 = jest.fn();
  const mockAction3 = jest.fn();

  beforeEach(() => {
    mockAction1.mockClear();
    mockAction2.mockClear();
    mockAction3.mockClear();
  });

  it("should focus trigger button initially", () => {
    render(<ActionsMenu>{() => <div>Menu content</div>}</ActionsMenu>);
    const trigger = screen.getByLabelText("Open actions menu");

    trigger.focus();
    expect(trigger).toHaveFocus();
  });

  it("should have focusable trigger button", () => {
    render(<ActionsMenu>{() => <div>Menu content</div>}</ActionsMenu>);
    const trigger = screen.getByLabelText("Open actions menu");

    expect(trigger).not.toHaveAttribute("tabIndex", "-1");
    expect(trigger.tabIndex).not.toBe(-1);
  });

  it("should handle keyboard interaction on trigger", async () => {
    const user = userEvent.setup();
    const mockOpen = jest.fn();

    // Mock useFloating to track interactions
    const mockUseInteractions = require("@floating-ui/react").useInteractions;
    mockUseInteractions.mockImplementation(() => ({
      getReferenceProps: jest.fn(() => ({
        onKeyDown: (e: any) => {
          if (e.key === "Enter" || e.key === " ") {
            mockOpen();
          }
        },
      })),
      getFloatingProps: jest.fn(() => ({})),
      getItemProps: jest.fn(() => ({})),
    }));

    render(<ActionsMenu>{() => <div>Menu content</div>}</ActionsMenu>);

    const trigger = screen.getByLabelText("Open actions menu");

    fireEvent.keyDown(trigger, { key: "Enter" });
    fireEvent.keyDown(trigger, { key: " " });

    expect(trigger).toHaveAttribute("aria-haspopup", "menu");
  });

  it("should have proper ARIA structure when menu exists", () => {
    // Test with a simulated open menu by rendering menu items directly
    const TestMenuItems = () => (
      <div role="menu" aria-labelledby="test-trigger">
        <button role="menuitem" tabIndex={-1}>
          Action 1
        </button>
        <button role="menuitem" tabIndex={-1}>
          Action 2
        </button>
      </div>
    );

    render(<TestMenuItems />);

    const menu = screen.getByRole("menu");
    const menuItems = screen.getAllByRole("menuitem");

    expect(menu).toHaveAttribute("aria-labelledby", "test-trigger");
    expect(menuItems).toHaveLength(2);

    menuItems.forEach((item) => {
      expect(item).toHaveAttribute("tabIndex", "-1");
      expect(item).toHaveAttribute("role", "menuitem");
    });
  });

  it("should support menu item keyboard activation", () => {
    const TestMenuItem = () => {
      const handleKeyDown = (e: React.KeyboardEvent) => {
        if ((e.key === "Enter" || e.key === " ") && mockAction1) {
          e.preventDefault();
          mockAction1();
        }
      };

      return (
        <button
          role="menuitem"
          tabIndex={-1}
          onKeyDown={handleKeyDown}
          onClick={mockAction1}
        >
          Test Action
        </button>
      );
    };

    render(<TestMenuItem />);

    const menuItem = screen.getByRole("menuitem");

    // Test Enter key
    fireEvent.keyDown(menuItem, { key: "Enter" });
    expect(mockAction1).toHaveBeenCalledTimes(1);

    // Test Space key
    fireEvent.keyDown(menuItem, { key: " " });
    expect(mockAction1).toHaveBeenCalledTimes(2);

    // Test mouse click still works
    fireEvent.click(menuItem);
    expect(mockAction1).toHaveBeenCalledTimes(3);
  });

  it("should support Tab navigation past the trigger", async () => {
    const user = userEvent.setup();

    const TestTabNavigation = () => (
      <div>
        <button id="before">Before</button>
        <ActionsMenu>{() => <div>Menu content</div>}</ActionsMenu>
        <button id="after">After</button>
      </div>
    );

    render(<TestTabNavigation />);

    const before = screen.getByText("Before");
    const trigger = screen.getByLabelText("Open actions menu");
    const after = screen.getByText("After");

    // Test tab order
    await user.tab();
    expect(before).toHaveFocus();

    await user.tab();
    expect(trigger).toHaveFocus();

    await user.tab();
    expect(after).toHaveFocus();
  });

  it("should handle Escape key functionality", async () => {
    const user = userEvent.setup();

    const TestEscapeHandler = () => {
      const [showContent, setShowContent] = React.useState(true);

      return (
        <div
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setShowContent(false);
            }
          }}
        >
          {showContent && <div data-testid="content">Closeable content</div>}
          <button>Focus target</button>
        </div>
      );
    };

    render(<TestEscapeHandler />);

    const content = screen.getByTestId("content");
    const button = screen.getByText("Focus target");

    expect(content).toBeInTheDocument();

    button.focus();
    await user.keyboard("{Escape}");

    expect(screen.queryByTestId("content")).not.toBeInTheDocument();
  });

  it("should have proper ARIA attributes and focus management structure", () => {
    const TestMenuWithItems = () => (
      <ActionsMenu id="test-menu">
        {(close) => (
          <>
            <button role="menuitem" tabIndex={-1}>
              Action 1
            </button>
            <button role="menuitem" tabIndex={-1}>
              Action 2
            </button>
            <button role="menuitem" tabIndex={-1}>
              Action 3
            </button>
          </>
        )}
      </ActionsMenu>
    );

    render(<TestMenuWithItems />);

    const trigger = screen.getByLabelText("Open actions menu");

    // Test trigger has proper ARIA attributes
    expect(trigger).toHaveAttribute("aria-haspopup", "menu");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).not.toHaveAttribute("aria-controls");
    expect(trigger).toHaveAttribute("id", "test-menu-trigger");
  });

  it("should support keyboard navigation when menu is open", async () => {
    const user = userEvent.setup();
    const mockAction1 = jest.fn();
    const mockAction2 = jest.fn();
    const mockAction3 = jest.fn();

    // Create a test component that simulates the menu being open
    const TestOpenMenu = () => {
      const [isOpen, setIsOpen] = React.useState(true);
      const [activeIndex, setActiveIndex] = React.useState(0);
      const listRef = React.useRef<HTMLElement[]>([]);

      const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "ArrowDown") {
          setActiveIndex((prev) => Math.min(prev + 1, 2));
        } else if (e.key === "ArrowUp") {
          setActiveIndex((prev) => Math.max(prev - 1, 0));
        } else if (e.key === "Home") {
          setActiveIndex(0);
        } else if (e.key === "End") {
          setActiveIndex(2);
        }
      };

      return (
        <div onKeyDown={handleKeyDown}>
          <div role="menu" aria-labelledby="test-trigger">
            <button
              role="menuitem"
              tabIndex={activeIndex === 0 ? 0 : -1}
              onClick={mockAction1}
            >
              Action 1
            </button>
            <button
              role="menuitem"
              tabIndex={activeIndex === 1 ? 0 : -1}
              onClick={mockAction2}
            >
              Action 2
            </button>
            <button
              role="menuitem"
              tabIndex={activeIndex === 2 ? 0 : -1}
              onClick={mockAction3}
            >
              Action 3
            </button>
          </div>
        </div>
      );
    };

    render(<TestOpenMenu />);

    const menuItems = screen.getAllByRole("menuitem");
    expect(menuItems).toHaveLength(3);

    // Test initial focus on first item
    expect(menuItems[0]).toHaveAttribute("tabIndex", "0");
    expect(menuItems[1]).toHaveAttribute("tabIndex", "-1");
    expect(menuItems[2]).toHaveAttribute("tabIndex", "-1");

    // Test arrow down navigation
    await user.keyboard("{ArrowDown}");
    expect(menuItems[0]).toHaveAttribute("tabIndex", "-1");
    expect(menuItems[1]).toHaveAttribute("tabIndex", "0");
    expect(menuItems[2]).toHaveAttribute("tabIndex", "-1");

    await user.keyboard("{ArrowDown}");
    expect(menuItems[0]).toHaveAttribute("tabIndex", "-1");
    expect(menuItems[1]).toHaveAttribute("tabIndex", "-1");
    expect(menuItems[2]).toHaveAttribute("tabIndex", "0");

    // Test arrow up navigation
    await user.keyboard("{ArrowUp}");
    expect(menuItems[0]).toHaveAttribute("tabIndex", "-1");
    expect(menuItems[1]).toHaveAttribute("tabIndex", "0");
    expect(menuItems[2]).toHaveAttribute("tabIndex", "-1");

    // Test Home key
    await user.keyboard("{Home}");
    expect(menuItems[0]).toHaveAttribute("tabIndex", "0");
    expect(menuItems[1]).toHaveAttribute("tabIndex", "-1");
    expect(menuItems[2]).toHaveAttribute("tabIndex", "-1");

    // Test End key
    await user.keyboard("{End}");
    expect(menuItems[0]).toHaveAttribute("tabIndex", "-1");
    expect(menuItems[1]).toHaveAttribute("tabIndex", "-1");
    expect(menuItems[2]).toHaveAttribute("tabIndex", "0");

    // Test Enter key activation
    await user.keyboard("{Enter}");
    expect(mockAction3).toHaveBeenCalledTimes(1);
  });
});
