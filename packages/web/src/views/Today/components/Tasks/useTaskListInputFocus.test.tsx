import React, { useRef } from "react";
import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import { useTaskListInputFocus } from "./useTaskListInputFocus";

interface HookTestHarnessProps {
  isAddingTask: boolean;
}

function HookTestHarness({ isAddingTask }: HookTestHarnessProps) {
  const addTaskInputRef = useRef<HTMLInputElement>(null);

  useTaskListInputFocus({
    isAddingTask,
    addTaskInputRef,
  });

  return (
    <div>
      <input ref={addTaskInputRef} aria-label="New task title" />
    </div>
  );
}

describe("useTaskListInputFocus", () => {
  it("focuses the add task input when entering add mode", async () => {
    const { rerender } = render(<HookTestHarness isAddingTask={false} />);

    rerender(<HookTestHarness isAddingTask />);

    await waitFor(() => {
      expect(screen.getByLabelText("New task title")).toHaveFocus();
    });
  });
});
