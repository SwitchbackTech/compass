import type React from "react";
import { createContext } from "react";
import { type Task } from "@web/common/types/task.types";
import { getTaskRepository } from "@web/tasks/repositories/task.repository.util";
import { useDateNavigation } from "@web/views/Day/hooks/navigation/useDateNavigation";
import { useTaskActions } from "@web/views/Day/hooks/tasks/useTaskActions";
import { useTaskState } from "@web/views/Day/hooks/tasks/useTaskState";

interface TaskContextValue {
  tasks: Task[];
  isLoadingTasks: boolean;
  hasLoadedTasksOnce: boolean;
  editingTitle: string;
  editingTaskId: string | null;
  isAddingTask: boolean;
  isCancellingEdit: boolean;
  selectedTaskIndex: number;
  addTask: (title: string) => Task;
  deleteTask: (taskId: string) => void;
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
const localTaskRepository = getTaskRepository("local");

interface TaskProviderProps {
  children: React.ReactNode;
}

export function TaskProvider({ children }: TaskProviderProps) {
  const { dateInView } = useDateNavigation();
  const state = useTaskState({
    currentDate: dateInView.toDate(),
    taskRepository: localTaskRepository,
  });
  const actions = useTaskActions({
    setTasks: state.setTasks,
    tasks: state.tasks,
    taskRepository: localTaskRepository,
    isLoadingTasks: state.isLoadingTasks,
    editingTitle: state.editingTitle,
    setEditingTitle: state.setEditingTitle,
    setEditingTaskId: state.setEditingTaskId,
    isCancellingEdit: state.isCancellingEdit,
    isCancellingEditRef: state.isCancellingEditRef,
    setIsCancellingEdit: state.setIsCancellingEdit,
    dateInView,
  });

  const value: TaskContextValue = {
    tasks: state.tasks,
    isLoadingTasks: state.isLoadingTasks,
    hasLoadedTasksOnce: state.hasLoadedTasksOnce,
    editingTitle: state.editingTitle,
    editingTaskId: state.editingTaskId,
    selectedTaskIndex: state.selectedTaskIndex,
    isAddingTask: state.isAddingTask,
    isCancellingEdit: state.isCancellingEdit,
    addTask: actions.addTask,
    deleteTask: actions.deleteTask,
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
