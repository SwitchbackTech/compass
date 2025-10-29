import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { UndoDeleteToast, showUndoDeleteToast } from "./UndoDeleteToast";

jest.mock("react-toastify", () => ({
  toast: jest.fn(),
  dismiss: jest.fn(),
  update: jest.fn(),
}));

// Mock the getMetaKey utility
jest.mock("@web/common/utils/shortcut/shortcut.util", () => ({
  getMetaKey: jest.fn(() => <span data-testid="meta-key">⌘</span>),
}));

describe("UndoDeleteToast", () => {
  const mockOnRestore = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock toast methods
    const { toast } = require("react-toastify");
    toast.dismiss = jest.fn();
    toast.update = jest.fn();
  });

  describe("UndoDeleteToastComponent", () => {
    it("should render with correct text", () => {
      render(
        <UndoDeleteToast onRestore={mockOnRestore} toastId="test-toast-id" />,
      );

      expect(screen.getByText("Deleted")).toBeInTheDocument();
      expect(screen.getByText("Undo")).toBeInTheDocument();
    });

    it("should display keyboard shortcut hint", () => {
      render(
        <UndoDeleteToast onRestore={mockOnRestore} toastId="test-toast-id" />,
      );

      expect(screen.getByText("+ Z")).toBeInTheDocument();
      expect(screen.getByTestId("meta-key")).toBeInTheDocument();
    });

    it("should call onRestore when clicked", () => {
      render(
        <UndoDeleteToast onRestore={mockOnRestore} toastId="test-toast-id" />,
      );

      const toastButton = screen.getByText("Deleted").closest("button");
      fireEvent.click(toastButton!);

      expect(mockOnRestore).toHaveBeenCalledTimes(1);
    });

    it("should call toast.dismiss with specific toast ID when clicked", () => {
      const { toast } = require("react-toastify");
      const testToastId = "test-toast-id";

      render(
        <UndoDeleteToast onRestore={mockOnRestore} toastId={testToastId} />,
      );

      const toastButton = screen.getByText("Deleted").closest("button");
      fireEvent.click(toastButton!);

      expect(toast.dismiss).toHaveBeenCalledWith(testToastId);
    });
  });

  describe("showUndoDeleteToast", () => {
    it("should return toast ID", () => {
      const { toast } = require("react-toastify");
      toast.mockReturnValue("test-toast-id");

      const toastId = showUndoDeleteToast(mockOnRestore);

      expect(toastId).toBe("test-toast-id");
    });

    it("should call toast.update with the correct toast ID", () => {
      const { toast } = require("react-toastify");
      toast.mockReturnValue("test-toast-id");

      showUndoDeleteToast(mockOnRestore);

      expect(toast.update).toHaveBeenCalledWith("test-toast-id", {
        render: expect.any(Object),
      });
    });
  });
});
