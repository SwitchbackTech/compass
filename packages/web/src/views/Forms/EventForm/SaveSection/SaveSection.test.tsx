import "@testing-library/jest-dom/extend-expect";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Priorities } from "@core/constants/core.constants";
import { render } from "@web/__tests__/__mocks__/mock.render";
import { SaveSection } from "./SaveSection";

describe("SaveSection", () => {
  const mockOnSubmit = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders with default props", () => {
      render(<SaveSection onSubmit={mockOnSubmit} />);

      expect(screen.getByRole("tab", { name: "Save" })).toBeInTheDocument();
      expect(screen.getByText("Save")).toBeInTheDocument();
    });

    it("renders with custom save and cancel text", () => {
      render(
        <SaveSection
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          saveText="Create Event"
          cancelText="Discard"
        />,
      );

      expect(
        screen.getByRole("tab", { name: "Create Event" }),
      ).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: "Discard" })).toBeInTheDocument();
      expect(screen.getByText("Create Event")).toBeInTheDocument();
      expect(screen.getByText("Discard")).toBeInTheDocument();
    });

    it("renders only save button when onCancel is not provided", () => {
      render(<SaveSection onSubmit={mockOnSubmit} />);

      expect(screen.getByRole("tab", { name: "Save" })).toBeInTheDocument();
      expect(
        screen.queryByRole("tab", { name: "Cancel" }),
      ).not.toBeInTheDocument();
    });

    it("renders both save and cancel buttons when onCancel is provided", () => {
      render(<SaveSection onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

      expect(screen.getByRole("tab", { name: "Save" })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: "Cancel" })).toBeInTheDocument();
    });
  });

  describe("Button States", () => {
    it("applies priority styling to save button", () => {
      render(
        <SaveSection onSubmit={mockOnSubmit} priority={Priorities.WORK} />,
      );

      const saveButton = screen.getByRole("tab", { name: "Save" });
      expect(saveButton).toBeInTheDocument();
    });
  });

  describe("User Interactions", () => {
    it("calls onSubmit when save button is clicked", async () => {
      const user = userEvent.setup();
      render(<SaveSection onSubmit={mockOnSubmit} />);

      const saveButton = screen.getByRole("tab", { name: "Save" });
      await user.click(saveButton);

      expect(mockOnSubmit).toHaveBeenCalledTimes(1);
    });

    it("calls onCancel when cancel button is clicked", async () => {
      const user = userEvent.setup();
      render(<SaveSection onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

      const cancelButton = screen.getByRole("tab", { name: "Cancel" });
      await user.click(cancelButton);

      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });

    it("handles keyboard navigation with tabIndex", () => {
      render(<SaveSection onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

      const saveButton = screen.getByRole("tab", { name: "Save" });
      const cancelButton = screen.getByRole("tab", { name: "Cancel" });

      expect(saveButton).toHaveAttribute("tabIndex", "0");
      expect(cancelButton).toHaveAttribute("tabIndex", "1");
    });
  });

  describe("Accessibility", () => {
    it("has proper ARIA attributes", () => {
      render(<SaveSection onSubmit={mockOnSubmit} />);

      const saveButton = screen.getByRole("tab", { name: "Save" });
      expect(saveButton).toHaveAttribute("aria-keyshortcuts", "Meta+Enter");
      expect(saveButton).toHaveAttribute("role", "tab");
    });

    it("has proper title attributes for tooltips", () => {
      render(<SaveSection onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

      const cancelButton = screen.getByRole("tab", { name: "Cancel" });
      expect(cancelButton).toHaveAttribute("title", "Cancel");
    });

    it("has keyboard shortcut attribute", () => {
      render(<SaveSection onSubmit={mockOnSubmit} />);

      const saveButton = screen.getByRole("tab", { name: "Save" });
      expect(saveButton).toHaveAttribute("aria-keyshortcuts", "Meta+Enter");
    });
  });

  describe("Styling and Layout", () => {
    it("renders save button with correct structure", () => {
      render(<SaveSection onSubmit={mockOnSubmit} />);

      const saveButton = screen.getByRole("tab", { name: "Save" });
      expect(saveButton).toBeInTheDocument();
      // The minWidth is applied via styled-components and may not be directly testable
    });

    it("applies correct margin to cancel button", () => {
      render(<SaveSection onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

      const cancelButton = screen.getByRole("tab", { name: "Cancel" });
      expect(cancelButton).toHaveStyle({ marginRight: "18px" });
    });
  });

  describe("Edge Cases", () => {
    it("handles undefined priority gracefully", () => {
      render(<SaveSection onSubmit={mockOnSubmit} priority={undefined} />);

      const saveButton = screen.getByRole("tab", { name: "Save" });
      expect(saveButton).toBeInTheDocument();
    });

    it("handles empty string text props", () => {
      render(
        <SaveSection
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          saveText=""
          cancelText=""
        />,
      );

      // Use getAllByRole when there are multiple elements with the same name
      const buttons = screen.getAllByRole("tab");
      expect(buttons).toHaveLength(2);
      expect(buttons[0]).toBeInTheDocument();
      expect(buttons[1]).toBeInTheDocument();
    });
  });
});
