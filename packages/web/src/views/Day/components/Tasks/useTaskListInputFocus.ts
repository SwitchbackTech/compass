import { RefObject, useEffect } from "react";

interface UseTaskListInputFocusOptions {
  isAddingTask: boolean;
  isLoadingTasks: boolean;
  addTaskInputRef: RefObject<HTMLInputElement>;
}

export function useTaskListInputFocus({
  isAddingTask,
  isLoadingTasks,
  addTaskInputRef,
}: UseTaskListInputFocusOptions) {
  useEffect(() => {
    if (isAddingTask && !isLoadingTasks) {
      addTaskInputRef.current?.focus();
    }
  }, [isAddingTask, isLoadingTasks, addTaskInputRef]);
}
