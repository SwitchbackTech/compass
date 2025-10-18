import React from "react";
import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { Task } from "../../task.types";
import {
  UndoDeleteToastComponent,
  showUndoDeleteToast,
} from "./UndoDeleteToast";

jest.mock("react-toastify", () => ({
  toast: jest.fn(),
  dismiss: jest.fn(),
}));

// Mock the getMetaKey utility
jest.mock("@web/common/utils/shortcut/shortcut.util", () => ({
  getMetaKey: jest.fn(() => <span data-testid="meta-key">⌘</span>),
}));

describe("UndoDeleteToast", () => {
  const mockTask: Task = {
    id: "task-1",
    title: "Test Task",
    status: "todo",
    createdAt: "2024-01-01T10:00:00Z",
  };

  const mockOnRestore = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock toast.dismiss
    const { toast } = require("react-toastify");
    toast.dismiss = jest.fn();
  });

  describe("UndoDeleteToastComponent", () => {
    it("should render with correct text", () => {
      render(<UndoDeleteToastComponent onRestore={mockOnRestore} />);

      expect(screen.getByText("Deleted")).toBeInTheDocument();
      expect(screen.getByText("Undo")).toBeInTheDocument();
    });

    it("should display keyboard shortcut hint", () => {
      render(<UndoDeleteToastComponent onRestore={mockOnRestore} />);

      expect(screen.getByText("+ Z")).toBeInTheDocument();
      expect(screen.getByTestId("meta-key")).toBeInTheDocument();
    });

    it("should call onRestore when clicked", () => {
      render(<UndoDeleteToastComponent onRestore={mockOnRestore} />);

      const toastButton = screen.getByText("Deleted").closest("button");
      fireEvent.click(toastButton!);

      expect(mockOnRestore).toHaveBeenCalledTimes(1);
    });
  });

  describe("showUndoDeleteToast", () => {
    it("should call toast with correct parameters", () => {
      const { toast } = require("react-toastify");

      showUndoDeleteToast(mockTask, mockOnRestore);

      expect(toast).toHaveBeenCalledWith(
        expect.any(Object), // React component
        {
          autoClose: 5000,
          position: "bottom-left",
          closeOnClick: true,
          onClick: mockOnRestore,
        },
      );
    });
  });
});
