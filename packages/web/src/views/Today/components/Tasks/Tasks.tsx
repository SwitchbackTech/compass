import React, { useRef } from "react";
import { useTasks } from "../../context/TaskProvider";
import { Task } from "../Task/Task";

export const Tasks = () => {
  const {
    tasks,
    toggleTaskStatus,
    editInputRef,
    editingTaskId,
    editingTitle,
    setEditingTaskId,
    setEditingTitle,
    setSelectedTaskIndex,
    updateTaskTitle,
    deleteTask,
  } = useTasks();

  const taskButtonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const taskInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const escPressedRef = useRef(false);

  const focusOnNextInput = (index: number) => {
    console.log("focusing next input", index + 1);
    taskInputRefs.current[index + 1]?.focus();
  };

  const onCheckboxKeyDown = (
    e: React.KeyboardEvent,
    taskId: string,
    index: number,
    title: string,
  ) => {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      toggleTaskStatus(taskId);
    } else if (e.key === "e" || e.key === "E") {
      e.preventDefault();
      e.stopPropagation();
      setEditingTaskId(taskId);
      setEditingTitle(title);
      // Focus the input after entering edit mode
      setTimeout(() => {
        taskInputRefs.current[index]?.focus();
      }, 0);
    }
  };

  const onInputBlur = (taskId: string) => {
    if (editingTitle.trim() && !escPressedRef.current) {
      updateTaskTitle(taskId, editingTitle.trim());
    }
    setEditingTaskId(null);
    setEditingTitle("");
    // Reset the ESC flag
    escPressedRef.current = false;
  };

  const onInputClick = (taskId: string, index: number) => {
    console.log("onInputClick", taskId, index);
    setEditingTaskId(taskId);
    setEditingTitle(tasks.find((task) => task.id === taskId)?.title || "");
    setTimeout(() => {
      taskInputRefs.current[index]?.select();
    }, 0);
  };

  const onInputKeyDown = (
    e: React.KeyboardEvent,
    taskId: string,
    index: number,
    value: string,
  ) => {
    console.log("value", value);
    if (e.key === "Enter") {
      e.preventDefault();
      const trimmedTitle = editingTitle.trim();
      if (trimmedTitle === "") {
        // Delete task if title is empty
        deleteTask(tasks[index].id);
      } else {
        // Update task with new title
        updateTaskTitle(taskId, trimmedTitle);
      }
      setEditingTaskId(null);
      setEditingTitle("");
      // Move to next task input or circle
      if (index < tasks.length - 1) {
        focusOnNextInput(index + 1);
      } else {
        // If last task, focus the next circle
        taskButtonRefs.current[index + 1]?.focus();
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      escPressedRef.current = true;
      setEditingTaskId(null);
      setEditingTitle("");
      // Refocus the button
      taskButtonRefs.current[index]?.focus();
    }
  };

  return (
    <div className="mb-3 space-y-3">
      {tasks.map((task, index) => (
        <Task
          key={task.id}
          task={task}
          index={index}
          editInputRef={editInputRef}
          editingTaskId={editingTaskId}
          editingTitle={editingTitle}
          onFocus={setSelectedTaskIndex}
          onCheckboxKeyDown={onCheckboxKeyDown}
          onInputBlur={onInputBlur}
          onInputKeyDown={onInputKeyDown}
          onInputClick={onInputClick}
          onTitleChange={setEditingTitle}
          onStatusToggle={toggleTaskStatus}
          title={editingTaskId === task.id ? editingTitle : task.title}
          taskInputRefs={taskInputRefs}
          taskButtonRefs={taskButtonRefs}
        />
      ))}
    </div>
  );
};
