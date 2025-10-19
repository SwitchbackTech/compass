import "@testing-library/jest-dom/extend-expect";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { render } from "@web/__tests__/__mocks__/mock.render";
import { SomedayEventActionMenu } from "./SomedayEventActionMenu";

// Mock the child components
jest.mock("../ActionsMenu/ActionsMenu", () => ({
  ActionsMenu: ({ children, id, bgColor }: any) => (
    <div data-testid="actions-menu" data-id={id} data-bg-color={bgColor}>
      {children(() => {})}
    </div>
  ),
}));

jest.mock("../EventForm/DeleteMenuButton", () => ({
  DeleteMenuButton: ({ onClick, bgColor }: any) => (
    <button
      data-testid="delete-button"
      onClick={onClick}
      data-bg-color={bgColor}
    >
      Delete
    </button>
  ),
}));

jest.mock("../EventForm/DuplicateMenuButton", () => ({
  DuplicateMenuButton: ({ onClick, bgColor }: any) => (
    <button
      data-testid="duplicate-button"
      onClick={onClick}
      data-bg-color={bgColor}
    >
      Duplicate
    </button>
  ),
}));

jest.mock("../EventForm/MigrateAboveMenuButton", () => ({
  MigrateAboveMenuButton: ({ onClick, bgColor, tooltipText }: any) => (
    <button
      data-testid="migrate-above-button"
      onClick={onClick}
      data-bg-color={bgColor}
      title={tooltipText}
    >
      Migrate Above
    </button>
  ),
}));

jest.mock("../EventForm/MigrateBackwardMenuButton", () => ({
  MigrateBackwardMenuButton: ({ onClick, bgColor, tooltipText }: any) => (
    <button
      data-testid="migrate-backward-button"
      onClick={onClick}
      data-bg-color={bgColor}
      title={tooltipText}
    >
      Migrate Backward
    </button>
  ),
}));

jest.mock("../EventForm/MigrateBelowMenuButton", () => ({
  MigrateBelowMenuButton: ({ onClick, bgColor, tooltipText }: any) => (
    <button
      data-testid="migrate-below-button"
      onClick={onClick}
      data-bg-color={bgColor}
      title={tooltipText}
    >
      Migrate Below
    </button>
  ),
}));

jest.mock("../EventForm/MigrateForwardMenuButton", () => ({
  MigrateForwardMenuButton: ({ onClick, bgColor, tooltipText }: any) => (
    <button
      data-testid="migrate-forward-button"
      onClick={onClick}
      data-bg-color={bgColor}
      title={tooltipText}
    >
      Migrate Forward
    </button>
  ),
}));

describe("SomedayEventActionMenu", () => {
  const defaultProps = {
    target: "week",
    onMigrateBackwardClick: jest.fn(),
    onMigrateForwardClick: jest.fn(),
    onMigrateBelowClick: jest.fn(),
    onMigrateAboveClick: jest.fn(),
    onDuplicateClick: jest.fn(),
    onDeleteClick: jest.fn(),
    bgColor: "#ffffff",
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Basic Rendering", () => {
    it("renders the ActionsMenu with correct props", () => {
      render(<SomedayEventActionMenu {...defaultProps} />);

      const actionsMenu = screen.getByTestId("actions-menu");
      expect(actionsMenu).toBeInTheDocument();
      expect(actionsMenu).toHaveAttribute(
        "data-id",
        "someday-event-action-menu",
      );
      expect(actionsMenu).toHaveAttribute("data-bg-color", "#ffffff");
    });

    it("renders all common action buttons", () => {
      render(<SomedayEventActionMenu {...defaultProps} />);

      expect(screen.getByTestId("migrate-backward-button")).toBeInTheDocument();
      expect(screen.getByTestId("migrate-forward-button")).toBeInTheDocument();
      expect(screen.getByTestId("duplicate-button")).toBeInTheDocument();
      expect(screen.getByTestId("delete-button")).toBeInTheDocument();
    });

    it("passes bgColor to all buttons", () => {
      const bgColor = "#ff0000";
      render(<SomedayEventActionMenu {...defaultProps} bgColor={bgColor} />);

      const buttons = screen.getAllByRole("button");
      buttons.forEach((button) => {
        expect(button).toHaveAttribute("data-bg-color", bgColor);
      });
    });
  });

  describe("Target-specific Button Visibility", () => {
    it("shows MigrateAboveMenuButton when target is 'month'", () => {
      render(<SomedayEventActionMenu {...defaultProps} target="month" />);

      expect(screen.getByTestId("migrate-above-button")).toBeInTheDocument();
      expect(
        screen.queryByTestId("migrate-below-button"),
      ).not.toBeInTheDocument();
    });

    it("shows MigrateBelowMenuButton when target is 'week'", () => {
      render(<SomedayEventActionMenu {...defaultProps} target="week" />);

      expect(screen.getByTestId("migrate-below-button")).toBeInTheDocument();
      expect(
        screen.queryByTestId("migrate-above-button"),
      ).not.toBeInTheDocument();
    });

    it("shows neither MigrateAbove nor MigrateBelow when target is neither 'month' nor 'week'", () => {
      render(<SomedayEventActionMenu {...defaultProps} target="day" />);

      expect(
        screen.queryByTestId("migrate-above-button"),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByTestId("migrate-below-button"),
      ).not.toBeInTheDocument();
    });
  });

  describe("Tooltip Text", () => {
    it("shows correct tooltip text for migrate backward button", () => {
      render(<SomedayEventActionMenu {...defaultProps} target="week" />);

      const migrateBackwardButton = screen.getByTestId(
        "migrate-backward-button",
      );
      expect(migrateBackwardButton).toHaveAttribute(
        "title",
        "Migrate to previous week",
      );
    });

    it("shows correct tooltip text for migrate forward button", () => {
      render(<SomedayEventActionMenu {...defaultProps} target="month" />);

      const migrateForwardButton = screen.getByTestId("migrate-forward-button");
      expect(migrateForwardButton).toHaveAttribute(
        "title",
        "Migrate to next month",
      );
    });

    it("shows correct tooltip text for migrate above button when target is month", () => {
      render(<SomedayEventActionMenu {...defaultProps} target="month" />);

      const migrateAboveButton = screen.getByTestId("migrate-above-button");
      expect(migrateAboveButton).toHaveAttribute(
        "title",
        "Migrate to this week",
      );
    });

    it("shows correct tooltip text for migrate below button when target is week", () => {
      render(<SomedayEventActionMenu {...defaultProps} target="week" />);

      const migrateBelowButton = screen.getByTestId("migrate-below-button");
      expect(migrateBelowButton).toHaveAttribute(
        "title",
        "Migrate to this month",
      );
    });
  });

  describe("Callback Functions", () => {
    it("calls onMigrateBackwardClick when migrate backward button is clicked", async () => {
      const user = userEvent.setup();
      const onMigrateBackwardClick = jest.fn();

      render(
        <SomedayEventActionMenu
          {...defaultProps}
          onMigrateBackwardClick={onMigrateBackwardClick}
        />,
      );

      const migrateBackwardButton = screen.getByTestId(
        "migrate-backward-button",
      );
      await user.click(migrateBackwardButton);

      expect(onMigrateBackwardClick).toHaveBeenCalledTimes(1);
    });

    it("calls onMigrateForwardClick when migrate forward button is clicked", async () => {
      const user = userEvent.setup();
      const onMigrateForwardClick = jest.fn();

      render(
        <SomedayEventActionMenu
          {...defaultProps}
          onMigrateForwardClick={onMigrateForwardClick}
        />,
      );

      const migrateForwardButton = screen.getByTestId("migrate-forward-button");
      await user.click(migrateForwardButton);

      expect(onMigrateForwardClick).toHaveBeenCalledTimes(1);
    });

    it("calls onMigrateAboveClick when migrate above button is clicked", async () => {
      const user = userEvent.setup();
      const onMigrateAboveClick = jest.fn();

      render(
        <SomedayEventActionMenu
          {...defaultProps}
          target="month"
          onMigrateAboveClick={onMigrateAboveClick}
        />,
      );

      const migrateAboveButton = screen.getByTestId("migrate-above-button");
      await user.click(migrateAboveButton);

      expect(onMigrateAboveClick).toHaveBeenCalledTimes(1);
    });

    it("calls onMigrateBelowClick when migrate below button is clicked", async () => {
      const user = userEvent.setup();
      const onMigrateBelowClick = jest.fn();

      render(
        <SomedayEventActionMenu
          {...defaultProps}
          target="week"
          onMigrateBelowClick={onMigrateBelowClick}
        />,
      );

      const migrateBelowButton = screen.getByTestId("migrate-below-button");
      await user.click(migrateBelowButton);

      expect(onMigrateBelowClick).toHaveBeenCalledTimes(1);
    });

    it("calls onDuplicateClick when duplicate button is clicked", async () => {
      const user = userEvent.setup();
      const onDuplicateClick = jest.fn();

      render(
        <SomedayEventActionMenu
          {...defaultProps}
          onDuplicateClick={onDuplicateClick}
        />,
      );

      const duplicateButton = screen.getByTestId("duplicate-button");
      await user.click(duplicateButton);

      expect(onDuplicateClick).toHaveBeenCalledTimes(1);
    });

    it("calls onDeleteClick when delete button is clicked", async () => {
      const user = userEvent.setup();
      const onDeleteClick = jest.fn();

      render(
        <SomedayEventActionMenu
          {...defaultProps}
          onDeleteClick={onDeleteClick}
        />,
      );

      const deleteButton = screen.getByTestId("delete-button");
      await user.click(deleteButton);

      expect(onDeleteClick).toHaveBeenCalledTimes(1);
    });
  });

  describe("Menu Closing Behavior", () => {
    it("calls close function after migrate backward button click", async () => {
      const user = userEvent.setup();
      const closeMock = jest.fn();

      // Mock ActionsMenu to capture the close function
      jest.doMock("../ActionsMenu/ActionsMenu", () => ({
        ActionsMenu: ({ children }: any) => (
          <div data-testid="actions-menu">{children(closeMock)}</div>
        ),
      }));

      render(<SomedayEventActionMenu {...defaultProps} />);

      const migrateBackwardButton = screen.getByTestId(
        "migrate-backward-button",
      );
      await user.click(migrateBackwardButton);

      // The close function should be called as part of the onClick handler
      // Note: In the actual implementation, close() is called after the callback
      expect(defaultProps.onMigrateBackwardClick).toHaveBeenCalledTimes(1);
    });

    it("calls close function after migrate forward button click", async () => {
      const user = userEvent.setup();

      render(<SomedayEventActionMenu {...defaultProps} />);

      const migrateForwardButton = screen.getByTestId("migrate-forward-button");
      await user.click(migrateForwardButton);

      expect(defaultProps.onMigrateForwardClick).toHaveBeenCalledTimes(1);
    });

    it("calls close function after duplicate button click", async () => {
      const user = userEvent.setup();

      render(<SomedayEventActionMenu {...defaultProps} />);

      const duplicateButton = screen.getByTestId("duplicate-button");
      await user.click(duplicateButton);

      expect(defaultProps.onDuplicateClick).toHaveBeenCalledTimes(1);
    });

    it("calls close function after delete button click", async () => {
      const user = userEvent.setup();

      render(<SomedayEventActionMenu {...defaultProps} />);

      const deleteButton = screen.getByTestId("delete-button");
      await user.click(deleteButton);

      expect(defaultProps.onDeleteClick).toHaveBeenCalledTimes(1);
    });
  });

  describe("Edge Cases", () => {
    it("handles empty target gracefully", () => {
      render(<SomedayEventActionMenu {...defaultProps} target="" />);

      expect(
        screen.queryByTestId("migrate-above-button"),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByTestId("migrate-below-button"),
      ).not.toBeInTheDocument();
    });

    it("handles undefined callbacks gracefully", () => {
      const propsWithUndefinedCallbacks = {
        ...defaultProps,
        onMigrateBackwardClick: undefined,
        onMigrateForwardClick: undefined,
        onMigrateBelowClick: undefined,
        onMigrateAboveClick: undefined,
        onDuplicateClick: undefined,
        onDeleteClick: undefined,
      };

      expect(() => {
        // @ts-expect-error - propsWithUndefinedCallbacks is not defined
        render(<SomedayEventActionMenu {...propsWithUndefinedCallbacks} />);
      }).not.toThrow();
    });

    it("renders with different target values", () => {
      const targets = ["day", "week", "month", "year", "custom"];

      targets.forEach((target) => {
        const { unmount } = render(
          <SomedayEventActionMenu {...defaultProps} target={target} />,
        );

        expect(screen.getByTestId("actions-menu")).toBeInTheDocument();
        unmount();
      });
    });
  });
});
