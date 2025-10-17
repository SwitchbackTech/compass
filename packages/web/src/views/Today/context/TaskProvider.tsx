import React, { createContext, useContext } from "react";
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
  addTask: (title: string) => Task;
  deleteTask: (taskId: string) => void;
  focusOnCheckbox: (index: number) => void;
  focusOnInputByIndex: (index: number) => void;
  onCheckboxKeyDown: (
    e: React.KeyboardEvent,
    taskId: string,
    title: string,
  ) => void;
  onInputBlur: (taskId: string) => void;
  onInputClick: (taskId: string) => void;
  onInputKeyDown: (
    e: React.KeyboardEvent,
    taskId: string,
    index: number,
  ) => void;
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
    editingTitle: state.editingTitle,
    editingTaskId: state.editingTaskId,
    selectedTaskIndex: state.selectedTaskIndex,
    isAddingTask: state.isAddingTask,
    isCancellingEdit: state.isCancellingEdit,
    addTask: actions.addTask,
    deleteTask: actions.deleteTask,
    focusOnCheckbox: actions.focusOnCheckbox,
    focusOnInputByIndex: actions.focusOnInputByIndex,
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

export function useTasks(): TaskContextValue {
  const context = useContext(TaskContext);
  if (!context) {
    throw new Error("useTasks must be used within a TaskProvider");
  }
  return context;
}
