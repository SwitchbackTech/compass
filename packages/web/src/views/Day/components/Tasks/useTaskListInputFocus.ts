import { RefObject, useEffect } from "react";

interface UseTaskListInputFocusOptions {
  isAddingTask: boolean;
  addTaskInputRef: RefObject<HTMLInputElement>;
}

export function useTaskListInputFocus({
  isAddingTask,
  addTaskInputRef,
}: UseTaskListInputFocusOptions) {
  useEffect(() => {
    if (isAddingTask) {
      addTaskInputRef.current?.focus();
    }
  }, [isAddingTask, addTaskInputRef]);
}
