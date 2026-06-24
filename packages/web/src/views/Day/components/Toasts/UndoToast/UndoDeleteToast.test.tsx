import { beforeEach, describe, expect, it, mock } from "bun:test";
import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { getModifierKeyTestId } from "@web/common/shortcuts/shortcut.util";

type ToastMock = ReturnType<typeof mock> & {
  dismiss: ReturnType<typeof mock>;
  update: ReturnType<typeof mock>;
};

const toastMock = mock(() => "test-toast-id") as ToastMock;
toastMock.dismiss = mock();
toastMock.update = mock();

mock.module("react-toastify", () => ({
  ToastContainer: () => null,
  toast: toastMock,
}));

const { showUndoDeleteToast, UndoDeleteToast } =
  require("@web/views/Day/components/Toasts/UndoToast/UndoDeleteToast") as typeof import("@web/views/Day/components/Toasts/UndoToast/UndoDeleteToast");

describe("UndoDeleteToast", () => {
  const mockOnRestore = mock();

  beforeEach(() => {
    toastMock.mockClear();
    toastMock.dismiss.mockClear();
    toastMock.update.mockClear();
    mockOnRestore.mockClear();
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

      expect(screen.getByText("Z")).toBeInTheDocument();
      expect(screen.getByTestId(getModifierKeyTestId())).toBeInTheDocument();
    });

    it("should call onRestore when clicked", () => {
      render(
        <UndoDeleteToast onRestore={mockOnRestore} toastId="test-toast-id" />,
      );

      const toastButton = screen.getByText("Deleted").closest("button");
      if (!toastButton) {
        throw new Error("Expected toast button");
      }
      fireEvent.click(toastButton);

      expect(mockOnRestore).toHaveBeenCalledTimes(1);
    });

    it("should call toast.dismiss with specific toast ID when clicked", () => {
      const testToastId = "test-toast-id";

      render(
        <UndoDeleteToast onRestore={mockOnRestore} toastId={testToastId} />,
      );

      const toastButton = screen.getByText("Deleted").closest("button");
      if (!toastButton) {
        throw new Error("Expected toast button");
      }
      fireEvent.click(toastButton);

      expect(toastMock.dismiss).toHaveBeenCalledWith(testToastId);
    });
  });

  describe("showUndoDeleteToast", () => {
    it("should return toast ID", () => {
      const toastId = showUndoDeleteToast(mockOnRestore);

      expect(toastId).toBe("test-toast-id");
    });

    it("should call toast.update with the correct toast ID", () => {
      showUndoDeleteToast(mockOnRestore);

      expect(toastMock.update).toHaveBeenCalledWith("test-toast-id", {
        render: expect.any(Object),
      });
    });
  });
});
