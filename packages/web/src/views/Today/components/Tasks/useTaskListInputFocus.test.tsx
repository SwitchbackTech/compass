import React, { useRef } from "react";
import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import { useTaskListInputFocus } from "./useTaskListInputFocus";

interface HookTestHarnessProps {
  isAddingTask: boolean;
  editingTaskId: string | null;
}

function HookTestHarness({
  isAddingTask,
  editingTaskId,
}: HookTestHarnessProps) {
  const addTaskInputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  useTaskListInputFocus({
    isAddingTask,
    editingTaskId,
    addTaskInputRef,
    editInputRef,
  });

  return (
    <div>
      <input ref={addTaskInputRef} aria-label="New task title" />
      {editingTaskId ? (
        <input
          ref={editInputRef}
          defaultValue="Existing task"
          aria-label="Edit task title"
        />
      ) : null}
    </div>
  );
}

describe("useTaskListInputFocus", () => {
  it("focuses the add task input when entering add mode", async () => {
    const { rerender } = render(
      <HookTestHarness isAddingTask={false} editingTaskId={null} />,
    );

    rerender(<HookTestHarness isAddingTask editingTaskId={null} />);

    await waitFor(() => {
      expect(screen.getByLabelText("New task title")).toHaveFocus();
    });
  });

  it("focuses and positions cursor at end of edit task input when a task enters edit mode", async () => {
    const { rerender } = render(
      <HookTestHarness isAddingTask={false} editingTaskId={null} />,
    );

    rerender(<HookTestHarness isAddingTask={false} editingTaskId="task-1" />);

    const editInput = await screen.findByLabelText("Edit task title");
    await waitFor(() => {
      expect(editInput).toHaveFocus();
      expect(editInput.selectionStart).toBe(editInput.value.length);
      expect(editInput.selectionEnd).toBe(editInput.value.length);
    });
  });
});
