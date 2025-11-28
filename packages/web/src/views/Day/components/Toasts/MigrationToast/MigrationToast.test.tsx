import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { getModifierKeyTestId } from "@web/common/utils/shortcut/shortcut.util";
import { showMigrationToast } from "@web/views/Day/components/Toasts/MigrationToast/MigrationToast";

describe("MigrationToast", () => {
  const { toast } = jest.requireMock("react-toastify");
  const mockOnNavigate = jest.fn();
  const mockOnUndo = jest.fn();

  describe("MigrationToastComponent", () => {
    it("renders forward migration message", () => {
      toast.mockReturnValue("test-toast-id");

      showMigrationToast("forward", mockOnNavigate, mockOnUndo);

      const toastCall = toast.mock.calls[0][0];
      render(toastCall);

      expect(screen.getByText("Migrated forward.")).toBeInTheDocument();
    });

    it("renders backward migration message", () => {
      toast.mockReturnValue("test-toast-id");

      showMigrationToast("backward", mockOnNavigate, mockOnUndo);

      const toastCall = toast.mock.calls[0][0];
      render(toastCall);

      expect(screen.getByText("Migrated backward.")).toBeInTheDocument();
    });

    it("displays undo hint with keyboard shortcut", () => {
      toast.mockReturnValue("test-toast-id");

      showMigrationToast("forward", mockOnNavigate, mockOnUndo);

      const toastCall = toast.mock.calls[0][0];
      render(toastCall);

      expect(screen.getByText("Undo")).toBeInTheDocument();
      expect(screen.getByText("+ Z")).toBeInTheDocument();
      expect(screen.getByTestId(getModifierKeyTestId())).toBeInTheDocument();
    });

    it("displays navigate button", () => {
      toast.mockReturnValue("test-toast-id");

      showMigrationToast("forward", mockOnNavigate, mockOnUndo);

      const toastCall = toast.mock.calls[0][0];
      render(toastCall);

      expect(screen.getByText("Go to day")).toBeInTheDocument();
    });

    it("calls onUndo when undo section is clicked", () => {
      toast.mockReturnValue("test-toast-id");

      showMigrationToast("forward", mockOnNavigate, mockOnUndo);

      const toastCall = toast.mock.calls[0][0];
      render(toastCall);

      const undoButton = screen
        .getByText("Migrated forward.")
        .closest("button");
      fireEvent.click(undoButton!);

      expect(mockOnUndo).toHaveBeenCalledTimes(1);
    });

    it("calls toast.dismiss with toast ID when undo is clicked", () => {
      const testToastId = "test-toast-id";
      toast.mockReturnValue(testToastId);

      showMigrationToast("forward", mockOnNavigate, mockOnUndo);

      // Get the updated component (second call to toast.update)
      const updateCall = toast.update.mock.calls[0];
      const updatedComponent = updateCall[1].render;
      render(updatedComponent);

      const undoButton = screen
        .getByText("Migrated forward.")
        .closest("button");
      fireEvent.click(undoButton!);

      expect(toast.dismiss).toHaveBeenCalledWith(testToastId);
    });

    it("calls onNavigate when Go to day button is clicked", () => {
      toast.mockReturnValue("test-toast-id");

      showMigrationToast("forward", mockOnNavigate, mockOnUndo);

      const toastCall = toast.mock.calls[0][0];
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
      toast.mockReturnValue(expectedId);

      const toastId = showMigrationToast("forward", mockOnNavigate, mockOnUndo);

      expect(toastId).toBe(expectedId);
    });

    it("calls toast.update with the correct toast ID", () => {
      const testToastId = "test-toast-id";
      toast.mockReturnValue(testToastId);

      showMigrationToast("forward", mockOnNavigate, mockOnUndo);

      expect(toast.update).toHaveBeenCalledWith(testToastId, {
        render: expect.any(Object),
      });
    });
  });
});
