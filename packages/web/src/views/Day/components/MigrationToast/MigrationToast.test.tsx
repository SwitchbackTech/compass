import { toast } from "react-toastify";
import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { showMigrationToast } from "./MigrationToast";

jest.mock("react-toastify", () => ({
  toast: jest.fn(),
  dismiss: jest.fn(),
  update: jest.fn(),
}));

// Mock the getMetaKey utility
jest.mock("@web/common/utils/shortcut/shortcut.util", () => ({
  getMetaKey: jest.fn(() => <span data-testid="meta-key">⌘</span>),
}));

describe("MigrationToast", () => {
  const mockOnNavigate = jest.fn();
  const mockOnUndo = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock toast methods
    (toast as unknown as jest.Mock).dismiss = jest.fn();
    (toast as unknown as jest.Mock).update = jest.fn();
  });

  describe("MigrationToastComponent", () => {
    it("renders forward migration message", () => {
      (toast as unknown as jest.Mock).mockReturnValue("test-toast-id");

      showMigrationToast("forward", mockOnNavigate, mockOnUndo);

      const toastCall = (toast as unknown as jest.Mock).mock.calls[0][0];
      render(toastCall);

      expect(screen.getByText("Migrated forward 1 day.")).toBeInTheDocument();
    });

    it("renders backward migration message", () => {
      (toast as unknown as jest.Mock).mockReturnValue("test-toast-id");

      showMigrationToast("backward", mockOnNavigate, mockOnUndo);

      const toastCall = (toast as unknown as jest.Mock).mock.calls[0][0];
      render(toastCall);

      expect(screen.getByText("Migrated backward 1 day.")).toBeInTheDocument();
    });

    it("displays undo hint with keyboard shortcut", () => {
      (toast as unknown as jest.Mock).mockReturnValue("test-toast-id");

      showMigrationToast("forward", mockOnNavigate, mockOnUndo);

      const toastCall = (toast as unknown as jest.Mock).mock.calls[0][0];
      render(toastCall);

      expect(screen.getByText("Undo")).toBeInTheDocument();
      expect(screen.getByText("+ Z")).toBeInTheDocument();
      expect(screen.getByTestId("meta-key")).toBeInTheDocument();
    });

    it("displays navigate button", () => {
      (toast as unknown as jest.Mock).mockReturnValue("test-toast-id");

      showMigrationToast("forward", mockOnNavigate, mockOnUndo);

      const toastCall = (toast as unknown as jest.Mock).mock.calls[0][0];
      render(toastCall);

      expect(screen.getByText("Go to day")).toBeInTheDocument();
    });

    it("calls onUndo when undo section is clicked", () => {
      (toast as unknown as jest.Mock).mockReturnValue("test-toast-id");

      showMigrationToast("forward", mockOnNavigate, mockOnUndo);

      const toastCall = (toast as unknown as jest.Mock).mock.calls[0][0];
      render(toastCall);

      const undoButton = screen
        .getByText("Migrated forward 1 day.")
        .closest("button");
      fireEvent.click(undoButton!);

      expect(mockOnUndo).toHaveBeenCalledTimes(1);
    });

    it("calls toast.dismiss with toast ID when undo is clicked", () => {
      const testToastId = "test-toast-id";
      (toast as unknown as jest.Mock).mockReturnValue(testToastId);

      showMigrationToast("forward", mockOnNavigate, mockOnUndo);

      // Get the updated component (second call to toast.update)
      const updateCall = ((toast as unknown as jest.Mock).update as jest.Mock)
        .mock.calls[0];
      const updatedComponent = updateCall[1].render;
      render(updatedComponent);

      const undoButton = screen
        .getByText("Migrated forward 1 day.")
        .closest("button");
      fireEvent.click(undoButton!);

      expect((toast as unknown as jest.Mock).dismiss).toHaveBeenCalledWith(
        testToastId,
      );
    });

    it("calls onNavigate when Go to day button is clicked", () => {
      (toast as unknown as jest.Mock).mockReturnValue("test-toast-id");

      showMigrationToast("forward", mockOnNavigate, mockOnUndo);

      const toastCall = (toast as unknown as jest.Mock).mock.calls[0][0];
      render(toastCall);

      const navigateButton = screen.getByText("Go to day");
      fireEvent.click(navigateButton);

      expect(mockOnNavigate).toHaveBeenCalledTimes(1);
    });
  });

  describe("showMigrationToast", () => {
    it("calls toast with correct options", () => {
      showMigrationToast("forward", mockOnNavigate, mockOnUndo);

      expect(toast).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          autoClose: 5000,
          position: "bottom-left",
          closeOnClick: true,
        }),
      );
    });

    it("returns toast ID", () => {
      const expectedId = "test-toast-id";
      (toast as unknown as jest.Mock).mockReturnValue(expectedId);

      const toastId = showMigrationToast("forward", mockOnNavigate, mockOnUndo);

      expect(toastId).toBe(expectedId);
    });

    it("calls toast.update with the correct toast ID", () => {
      const testToastId = "test-toast-id";
      (toast as unknown as jest.Mock).mockReturnValue(testToastId);

      showMigrationToast("forward", mockOnNavigate, mockOnUndo);

      expect((toast as unknown as jest.Mock).update).toHaveBeenCalledWith(
        testToastId,
        {
          render: expect.any(Object),
        },
      );
    });
  });
});
