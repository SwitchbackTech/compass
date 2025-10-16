import { RefObject, useEffect } from "react";

interface UseTaskListInputFocusOptions {
  isAddingTask: boolean;
  editingTaskId: string | null;
  addTaskInputRef: RefObject<HTMLInputElement>;
  editInputRef: RefObject<HTMLInputElement>;
}

export function useTaskListInputFocus({
  isAddingTask,
  editingTaskId,
  addTaskInputRef,
  editInputRef,
}: UseTaskListInputFocusOptions) {
  useEffect(() => {
    if (isAddingTask) {
      addTaskInputRef.current?.focus();
    }
  }, [isAddingTask, addTaskInputRef]);

  useEffect(() => {
    if (editingTaskId) {
      const input = editInputRef.current;
      if (input) {
        input.focus();
        const length = input.value.length;
        input.setSelectionRange(length, length);
      }
    }
  }, [editingTaskId, editInputRef]);
}
