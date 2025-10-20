import React, { createContext } from "react";
import { useDateNavigation } from "../hooks/navigation/useDateNavigation";
import { useTaskActions } from "../hooks/tasks/useTaskActions";
import { useTaskEffects } from "../hooks/tasks/useTaskEffects";
import { useTaskState } from "../hooks/tasks/useTaskState";
import { Task } from "../task.types";

interface TaskContextValue {
  tasks: Task[];
  editingTitle: string;
  editingTaskId: string | null;
  isAddingTask: boolean;
  isCancellingEdit: boolean;
  selectedTaskIndex: number;
  deletedTask: Task | null;
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
}
export const TaskContext = createContext<TaskContextValue | undefined>(
  undefined,
);

interface TaskProviderProps {
  children: React.ReactNode;
}

export function TaskProvider({ children }: TaskProviderProps) {
  const { dateInView } = useDateNavigation();
  const state = useTaskState({ currentDate: dateInView.toDate() });
  const actions = useTaskActions({
    setTasks: state.setTasks,
    tasks: state.tasks,
    editingTitle: state.editingTitle,
    setEditingTitle: state.setEditingTitle,
    setEditingTaskId: state.setEditingTaskId,
    isCancellingEdit: state.isCancellingEdit,
    setIsCancellingEdit: state.setIsCancellingEdit,
    deletedTask: state.deletedTask,
    setDeletedTask: state.setDeletedTask,
    undoToastId: state.undoToastId,
    setUndoToastId: state.setUndoToastId,
  });

  useTaskEffects({
    tasks: state.tasks,
    dateKey: state.dateKey,
    lastLoadedKeyRef: state.lastLoadedKeyRef,
    setTasks: state.setTasks,
  });

  const value: TaskContextValue = {
    tasks: state.tasks,
    editingTitle: state.editingTitle,
    editingTaskId: state.editingTaskId,
    selectedTaskIndex: state.selectedTaskIndex,
    isAddingTask: state.isAddingTask,
    isCancellingEdit: state.isCancellingEdit,
    deletedTask: state.deletedTask,
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
  };

  return <TaskContext.Provider value={value}>{children}</TaskContext.Provider>;
}
