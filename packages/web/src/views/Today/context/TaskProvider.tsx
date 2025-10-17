import React, { createContext, useContext } from "react";
import { useTaskActions } from "../hooks/tasks/useTaskActions";
import { useTaskEffects } from "../hooks/tasks/useTaskEffects";
import { useTaskState } from "../hooks/tasks/useTaskState";
import { Task } from "../task.types";

interface TaskContextValue {
  tasks: Task[];
  addTask: (title: string) => Task;
  updateTaskTitle: (taskId: string, title: string) => void;
  toggleTaskStatus: (taskId: string) => void;
  deleteTask: (taskId: string) => void;
  editingTitle: string;
  selectedTaskIndex: number;
  setSelectedTaskIndex: (index: number) => void;
  setEditingTitle: (title: string) => void;
  editingTaskId: string | null;
  setEditingTaskId: (taskId: string | null) => void;
  isAddingTask: boolean;
  setIsAddingTask: (isAdding: boolean) => void;
  isCancellingEdit: boolean;
  setIsCancellingEdit: (isCancelling: boolean) => void;
  focusOnCheckbox: (index: number) => void;
  onCheckboxKeyDown: (
    e: React.KeyboardEvent,
    taskId: string,
    title: string,
  ) => void;
  onInputBlur: (taskId: string) => void;
  onInputClick: (taskId: string, index: number) => void;
  onInputKeyDown: (
    e: React.KeyboardEvent,
    taskId: string,
    index: number,
  ) => void;
  onTitleChange: (title: string) => void;
  onStatusToggle: (id: string) => void;
}
const TaskContext = createContext<TaskContextValue | undefined>(undefined);

interface TaskProviderProps {
  children: React.ReactNode;
  currentDate?: Date;
}

export function TaskProvider({
  children,
  currentDate = new Date(),
}: TaskProviderProps) {
  const state = useTaskState({ currentDate });
  const actions = useTaskActions({
    setTasks: state.setTasks,
    tasks: state.tasks,
    editingTitle: state.editingTitle,
    setEditingTitle: state.setEditingTitle,
    setEditingTaskId: state.setEditingTaskId,
    isCancellingEdit: state.isCancellingEdit,
    setIsCancellingEdit: state.setIsCancellingEdit,
  });

  useTaskEffects({
    tasks: state.tasks,
    dateKey: state.dateKey,
    lastLoadedKeyRef: state.lastLoadedKeyRef,
    setTasks: state.setTasks,
  });

  const value: TaskContextValue = {
    tasks: state.tasks,
    addTask: actions.addTask,
    updateTaskTitle: actions.updateTaskTitle,
    toggleTaskStatus: actions.toggleTaskStatus,
    deleteTask: actions.deleteTask,
    editingTitle: state.editingTitle,
    setEditingTitle: state.setEditingTitle,
    editingTaskId: state.editingTaskId,
    setEditingTaskId: state.setEditingTaskId,
    selectedTaskIndex: state.selectedTaskIndex,
    setSelectedTaskIndex: state.setSelectedTaskIndex,
    isAddingTask: state.isAddingTask,
    setIsAddingTask: state.setIsAddingTask,
    isCancellingEdit: state.isCancellingEdit,
    setIsCancellingEdit: state.setIsCancellingEdit,
    focusOnCheckbox: actions.focusOnCheckbox,
    onCheckboxKeyDown: actions.onCheckboxKeyDown,
    onInputBlur: actions.onInputBlur,
    onInputClick: actions.onInputClick,
    onInputKeyDown: actions.onInputKeyDown,
    onTitleChange: state.setEditingTitle,
    onStatusToggle: actions.toggleTaskStatus,
  };

  return <TaskContext.Provider value={value}>{children}</TaskContext.Provider>;
}

export function useTasks(): TaskContextValue {
  const context = useContext(TaskContext);
  if (!context) {
    throw new Error("useTasks must be used within a TaskProvider");
  }
  return context;
}
