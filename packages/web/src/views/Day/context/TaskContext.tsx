import React, { createContext } from "react";
import { Task, UndoOperation } from "@web/common/types/task.types";
import { useDateNavigation } from "@web/views/Day/hooks/navigation/useDateNavigation";
import { useTaskActions } from "@web/views/Day/hooks/tasks/useTaskActions";
import { useTaskState } from "@web/views/Day/hooks/tasks/useTaskState";

interface TaskContextValue {
  tasks: Task[];
  editingTitle: string;
  editingTaskId: string | null;
  isAddingTask: boolean;
  isCancellingEdit: boolean;
  selectedTaskIndex: number;
  undoState: UndoOperation | null;
  undoToastId: string | number | null;
  addTask: (title: string) => Task;
  deleteTask: (taskId: string) => void;
  restoreTask: () => void;
  focusOnCheckbox: (taskId: string) => void;
  focusOnInput: (taskId: string) => void;
  onCheckboxKeyDown: (
    e: React.KeyboardEvent,
    taskId: string,
    title: string,
  ) => void;
  onInputBlur: (taskId: string) => void;
  onInputClick: (taskId: string) => void;
  onInputKeyDown: (e: React.KeyboardEvent, taskId: string) => void;
  onTitleChange: (title: string) => void;
  onStatusToggle: (id: string) => void;
  setSelectedTaskIndex: (index: number) => void;
  setEditingTitle: (title: string) => void;
  setEditingTaskId: (taskId: string | null) => void;
  setIsAddingTask: (isAdding: boolean) => void;
  setIsCancellingEdit: (isCancelling: boolean) => void;
  toggleTaskStatus: (taskId: string) => void;
  updateTaskTitle: (taskId: string, title: string) => void;
  migrateTask: (id: string, direction: "forward" | "backward") => void;
  reorderTasks: (sourceIndex: number, destinationIndex: number) => void;
}
export const TaskContext = createContext<TaskContextValue | undefined>(
  undefined,
);

interface TaskProviderProps {
  children: React.ReactNode;
}

export function TaskProvider({ children }: TaskProviderProps) {
  const { dateInView, navigateToNextDay, navigateToPreviousDay } =
    useDateNavigation();
  const state = useTaskState({ currentDate: dateInView.toDate() });
  const actions = useTaskActions({
    setTasks: state.setTasks,
    tasks: state.tasks,
    editingTitle: state.editingTitle,
    setEditingTitle: state.setEditingTitle,
    setEditingTaskId: state.setEditingTaskId,
    isCancellingEdit: state.isCancellingEdit,
    setIsCancellingEdit: state.setIsCancellingEdit,
    undoState: state.undoState,
    setUndoState: state.setUndoState,
    undoToastId: state.undoToastId,
    setUndoToastId: state.setUndoToastId,
    dateInView,
    navigateToNextDay,
    navigateToPreviousDay,
  });

  const value: TaskContextValue = {
    tasks: state.tasks,
    editingTitle: state.editingTitle,
    editingTaskId: state.editingTaskId,
    selectedTaskIndex: state.selectedTaskIndex,
    isAddingTask: state.isAddingTask,
    isCancellingEdit: state.isCancellingEdit,
    undoState: state.undoState,
    undoToastId: state.undoToastId,
    addTask: actions.addTask,
    deleteTask: actions.deleteTask,
    restoreTask: actions.restoreTask,
    focusOnCheckbox: actions.focusOnCheckbox,
    focusOnInput: actions.focusOnInput,
    onCheckboxKeyDown: actions.onCheckboxKeyDown,
    onInputBlur: actions.onInputBlur,
    onInputClick: actions.onInputClick,
    onInputKeyDown: actions.onInputKeyDown,
    onTitleChange: state.setEditingTitle,
    onStatusToggle: actions.toggleTaskStatus,
    setEditingTitle: state.setEditingTitle,
    setEditingTaskId: state.setEditingTaskId,
    setSelectedTaskIndex: state.setSelectedTaskIndex,
    setIsAddingTask: state.setIsAddingTask,
    setIsCancellingEdit: state.setIsCancellingEdit,
    toggleTaskStatus: actions.toggleTaskStatus,
    updateTaskTitle: actions.updateTaskTitle,
    migrateTask: actions.migrateTask,
    reorderTasks: actions.reorderTasks,
  };

  return <TaskContext.Provider value={value}>{children}</TaskContext.Provider>;
}
