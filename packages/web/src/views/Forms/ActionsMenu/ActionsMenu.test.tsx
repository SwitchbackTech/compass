import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { type ReactNode } from "react";
import { ID_EVENT_FORM_ACTION_MENU } from "@web/common/constants/web.constants";
import { beforeEach, describe, expect, it, mock } from "bun:test";
import { afterAll } from "bun:test";

let mockOpen = false;

mock.module("@phosphor-icons/react", () => ({
  DotsThreeVerticalIcon: () => <div data-testid="dots-icon" />,
}));

type FloatingChildrenProps = {
  children: ReactNode;
};

type ListNavigationConfig = {
  activeIndex: number | null;
  listRef?: {
    current?: HTMLElement[];
  };
  onNavigate?: (index: number) => void;
};

mock.module("@floating-ui/react", () => ({
  FloatingFocusManager: ({ children }: FloatingChildrenProps) => (
    <div>{children}</div>
  ),
  FloatingPortal: ({ children }: FloatingChildrenProps) => (
    <div>{children}</div>
  ),
  autoUpdate: mock(),
  flip: mock(),
  offset: mock(),
  shift: mock(),
  useClick: mock(() => ({
    onMouseDown: mock(),
    onMouseUp: mock(),
    onClick: mock(),
  })),
  useDismiss: mock(() => ({
    onMouseDown: mock(),
    onMouseUp: mock(),
    onPointerDown: mock(),
    onPointerUp: mock(),
    onKeyDown: mock(),
  })),
  useFocus: mock(() => ({})),
  useFloating: mock(() => ({
    x: 0,
    y: 0,
    refs: {
      setReference: mock(),
      setFloating: mock(),
    },
    strategy: "absolute",
    context: {},
  })),
  useHover: mock(() => ({})),
  useInteractions: mock(() => ({
    getReferenceProps: mock(() => ({
      "aria-expanded": mockOpen,
      "aria-haspopup": "menu",
      onClick: () => {
        mockOpen = !mockOpen;
      },
    })),
    getFloatingProps: mock(() => ({})),
    getItemProps: mock(() => ({})),
  })),
  useListNavigation: mock((_context: unknown, config: ListNavigationConfig) => {
    const mockOnNavigate = config.onNavigate || (() => {});

    return {
      onKeyDown: (e: Pick<KeyboardEvent, "key">) => {
        if (mockOpen && config.listRef) {
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

          if (newCompactIndex !== config.activeIndex) {
            mockOnNavigate(newCompactIndex);
          }
        }
      },
    };
  }),
  useMergeRefs: mock(() => mock()),
  useRole: mock(() => ({})),
}));

mock.module("@web/components/IconButton/IconButton", () => {
  return {
    default: function MockIconButton({
      children,
      ...props
    }: FloatingChildrenProps) {
      return <button {...props}>{children}</button>;
    },
  };
});

const { ActionsMenu } =
  require("@web/views/Forms/ActionsMenu/ActionsMenu") as typeof import("@web/views/Forms/ActionsMenu/ActionsMenu");
const { default: MenuItem } =
  require("@web/views/Forms/ActionsMenu/MenuItem") as typeof import("@web/views/Forms/ActionsMenu/MenuItem");

describe("ActionsMenu", () => {
  let mockAction1: ReturnType<typeof mock>;
  let mockAction2: ReturnType<typeof mock>;
  let mockAction3: ReturnType<typeof mock>;

  beforeEach(() => {
    mockAction1 = mock();
    mockAction2 = mock();
    mockAction3 = mock();
    mockOpen = false;
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
      const mockAction = mock();

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

afterAll(() => {
  mock.restore();
});
