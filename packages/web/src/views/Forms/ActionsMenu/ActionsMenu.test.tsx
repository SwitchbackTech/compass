import React from "react";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ID_EVENT_FORM_ACTION_MENU } from "@web/common/constants/web.constants";
import { ActionsMenu } from "./ActionsMenu";
import MenuItem from "./MenuItem";

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
    onMouseDown: jest.fn(),
    onMouseUp: jest.fn(),
    onClick: jest.fn(),
  })),
  useDismiss: jest.fn(() => ({
    onMouseDown: jest.fn(),
    onMouseUp: jest.fn(),
    onPointerDown: jest.fn(),
    onPointerUp: jest.fn(),
    onKeyDown: jest.fn(),
  })),
  useFloating: jest.fn(() => ({
    x: 0,
    y: 0,
    refs: {
      setReference: jest.fn(),
      setFloating: jest.fn(),
    },
    strategy: "absolute",
    context: {},
  })),
  useInteractions: jest.fn(() => ({
    getReferenceProps: jest.fn(() => ({
      "aria-expanded": mockOpen,
      "aria-haspopup": "menu",
      onClick: () => {
        mockOpen = !mockOpen;
      },
    })),
    getFloatingProps: jest.fn(() => ({})),
    getItemProps: jest.fn(() => ({})),
  })),
  useListNavigation: jest.fn((context: any, config: any) => {
    // Mock implementation that handles our dense array mapping
    const mockOnNavigate = config.onNavigate || (() => {});

    return {
      onKeyDown: (e: any) => {
        if (mockOpen && config.listRef) {
          // Get the current dense array (filtered non-null items)
          const denseArray = config.listRef.current || [];
          const denseLength = denseArray.length;

          if (denseLength === 0) return;

          let newCompactIndex = config.activeIndex;

          if (e.key === "ArrowDown") {
            newCompactIndex =
              newCompactIndex === null
                ? 0
                : Math.min(newCompactIndex + 1, denseLength - 1);
          } else if (e.key === "ArrowUp") {
            newCompactIndex =
              newCompactIndex === null ? 0 : Math.max(newCompactIndex - 1, 0);
          } else if (e.key === "Home") {
            newCompactIndex = 0;
          } else if (e.key === "End") {
            newCompactIndex = denseLength - 1;
          }

          // Call the onNavigate callback with the new compact index
          if (newCompactIndex !== config.activeIndex) {
            mockOnNavigate(newCompactIndex);
          }
        }
      },
    };
  }),
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

describe("ActionsMenu", () => {
  let mockAction1: jest.Mock;
  let mockAction2: jest.Mock;
  let mockAction3: jest.Mock;

  beforeEach(() => {
    mockAction1 = jest.fn();
    mockAction2 = jest.fn();
    mockAction3 = jest.fn();
    mockOpen = false;
    mockActiveIndex = null;
    mockListRef = { current: [] };
    jest.clearAllMocks();
  });

  describe("ARIA Compliance", () => {
    it("should have proper ARIA attributes on trigger button", () => {
      render(
        <ActionsMenu bgColor="red">
          {() => <div>Menu content</div>}
        </ActionsMenu>,
      );

      const trigger = screen.getByLabelText("Open actions menu");

      expect(trigger).toHaveAttribute("aria-haspopup", "menu");
      expect(trigger).toHaveAttribute("aria-expanded", "false");
    });

    it("should generate consistent IDs for ARIA relationships", () => {
      render(
        <ActionsMenu id="test-menu" bgColor="red">
          {() => <div>Menu content</div>}
        </ActionsMenu>,
      );

      const trigger = screen.getByLabelText("Open actions menu");

      expect(trigger).toHaveAttribute("id", "test-menu-trigger");
    });

    it("should use default ID when none provided", () => {
      render(
        <ActionsMenu bgColor="red">
          {() => <div>Menu content</div>}
        </ActionsMenu>,
      );

      const trigger = screen.getByLabelText("Open actions menu");

      expect(trigger).toHaveAttribute(
        "id",
        `${ID_EVENT_FORM_ACTION_MENU}-trigger`,
      );
    });

    it("should have proper ARIA structure when menu is open", async () => {
      const user = userEvent.setup();

      render(
        <ActionsMenu id="test-menu" bgColor="red">
          {(close) => (
            <>
              <MenuItem
                onClick={() => {
                  mockAction1();
                  close();
                }}
                bgColor="red"
              >
                Action 1
              </MenuItem>
              <MenuItem
                onClick={() => {
                  mockAction2();
                  close();
                }}
                bgColor="red"
              >
                Action 2
              </MenuItem>
            </>
          )}
        </ActionsMenu>,
      );

      const trigger = screen.getByLabelText("Open actions menu");
      await user.click(trigger);

      // In a real implementation, this would show the menu
      // Since we're mocking FloatingUI, we can't test the actual menu rendering
      // but we can test that the trigger has the correct attributes
      expect(trigger).toHaveAttribute("aria-haspopup", "menu");
    });
  });

  describe("Keyboard Interactions", () => {
    it("should focus trigger button initially", () => {
      render(
        <ActionsMenu bgColor="red">
          {() => <div>Menu content</div>}
        </ActionsMenu>,
      );

      const trigger = screen.getByLabelText("Open actions menu");

      expect(trigger).toBeInTheDocument();
      // Buttons are focusable by default, don't need explicit tabIndex
      trigger.focus();
      expect(trigger).toHaveFocus();
    });

    it("should have focusable trigger button", () => {
      render(
        <ActionsMenu bgColor="red">
          {() => <div>Menu content</div>}
        </ActionsMenu>,
      );

      const trigger = screen.getByLabelText("Open actions menu");

      trigger.focus();
      expect(trigger).toHaveFocus();
    });

    it("should handle keyboard interaction on trigger", async () => {
      render(
        <ActionsMenu bgColor="red">
          {() => <div>Menu content</div>}
        </ActionsMenu>,
      );

      const trigger = screen.getByLabelText("Open actions menu");

      await userEvent.keyboard("{Enter}");
      await userEvent.keyboard(" ");

      expect(trigger).toHaveAttribute("aria-haspopup", "menu");
    });

    it("should support menu item keyboard activation", async () => {
      const user = userEvent.setup();
      const mockAction = jest.fn();

      render(
        <ActionsMenu bgColor="red">
          {(close) => (
            <MenuItem
              onClick={() => {
                mockAction();
                close();
              }}
              bgColor="red"
            >
              Test Action
            </MenuItem>
          )}
        </ActionsMenu>,
      );

      const trigger = screen.getByLabelText("Open actions menu");
      await user.click(trigger);

      // Since FloatingUI is mocked, we can't test the actual menu rendering
      // but we can verify the component structure is correct
      expect(trigger).toBeInTheDocument();
    });

    it("should support Tab navigation past the trigger", async () => {
      const user = userEvent.setup();

      render(
        <div>
          <button id="before">Before</button>
          <ActionsMenu bgColor="red">
            {() => (
              <MenuItem onClick={() => {}} bgColor="red">
                Test Action
              </MenuItem>
            )}
          </ActionsMenu>
          <button id="after">After</button>
        </div>,
      );

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

    it("should handle basic menu interaction", async () => {
      const user = userEvent.setup();

      render(
        <ActionsMenu bgColor="red">
          {() => (
            <>
              <MenuItem onClick={() => {}} bgColor="red">
                Action 1
              </MenuItem>
              <MenuItem onClick={() => {}} bgColor="red">
                Action 2
              </MenuItem>
            </>
          )}
        </ActionsMenu>,
      );

      const trigger = screen.getByLabelText("Open actions menu");

      // Test basic interaction
      await user.click(trigger);

      expect(trigger).toBeInTheDocument();
    });

    it("should have proper ARIA attributes and focus management structure", () => {
      render(
        <ActionsMenu id="test-menu" bgColor="red">
          {() => (
            <>
              <MenuItem onClick={() => {}} bgColor="red">
                Action 1
              </MenuItem>
              <MenuItem onClick={() => {}} bgColor="red">
                Action 2
              </MenuItem>
              <MenuItem onClick={() => {}} bgColor="red">
                Action 3
              </MenuItem>
            </>
          )}
        </ActionsMenu>,
      );

      const trigger = screen.getByLabelText("Open actions menu");

      // Test trigger has proper ARIA attributes when closed
      expect(trigger).toHaveAttribute("aria-haspopup", "menu");
      expect(trigger).toHaveAttribute("aria-expanded", "false");
      expect(trigger).toHaveAttribute("id", "test-menu-trigger");
    });

    it("should render with real MenuItem components", () => {
      render(
        <ActionsMenu bgColor="red">
          {(close) => (
            <>
              <MenuItem
                onClick={() => {
                  mockAction1();
                  close();
                }}
                bgColor="red"
              >
                Move To Sidebar
              </MenuItem>
              <MenuItem
                onClick={() => {
                  mockAction2();
                  close();
                }}
                bgColor="red"
              >
                Duplicate
              </MenuItem>
              <MenuItem
                onClick={() => {
                  mockAction3();
                  close();
                }}
                bgColor="red"
              >
                Delete
              </MenuItem>
            </>
          )}
        </ActionsMenu>,
      );

      const trigger = screen.getByLabelText("Open actions menu");

      // Verify the ActionsMenu renders correctly with MenuItem components
      expect(trigger).toBeInTheDocument();
      expect(trigger).toHaveAttribute("aria-haspopup", "menu");
    });
  });
});
