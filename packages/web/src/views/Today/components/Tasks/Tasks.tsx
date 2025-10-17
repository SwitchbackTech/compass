import React, { useState } from "react";
import { useTasks } from "../../context/TaskProvider";
import { Task } from "../Task/Task";

export const Tasks = () => {
  const {
    tasks,
    toggleTaskStatus,
    editingTaskId,
    editingTitle,
    setEditingTaskId,
    setEditingTitle,
    setSelectedTaskIndex,
    updateTaskTitle,
    deleteTask,
  } = useTasks();

  const [shouldCancelEdit, setShouldCancelEdit] = useState(false);

  const onCheckboxKeyDown = (
    e: React.KeyboardEvent,
    taskId: string,
    index: number,
    title: string,
  ) => {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      toggleTaskStatus(taskId);
    } else if (e.key.toLocaleLowerCase() === "e") {
      console.log("editing task", taskId);
      e.preventDefault();
      e.stopPropagation();
      setEditingTaskId(taskId);
      setEditingTitle(title);

      // Focus the input field after state updates
      setTimeout(() => {
        const inputElement = document.querySelector(
          `input[aria-label="Edit ${title}"]`,
        ) as HTMLInputElement;
        if (inputElement) {
          inputElement.focus();
          inputElement.select(); // Select all text for easy editing
        }
      }, 0);
    }
  };

  const onInputBlur = (taskId: string) => {
    // Small delay to allow ESC handler to set the flag first
    setTimeout(() => {
      if (shouldCancelEdit) {
        // Don't update the task title if we're canceling the edit
        setShouldCancelEdit(false);
        return;
      }

      if (editingTitle.trim()) {
        updateTaskTitle(taskId, editingTitle.trim());
      }
      setEditingTaskId(null);
      setEditingTitle("");
    }, 0);
  };

  const onInputClick = (taskId: string, index: number) => {
    console.log("onInputClick", taskId, index);
    setEditingTaskId(taskId);
    setEditingTitle(tasks.find((task) => task.id === taskId)?.title || "");
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
    } else if (e.key === "Escape") {
      e.preventDefault();
      setShouldCancelEdit(true);
      setEditingTaskId(null);
      setEditingTitle("");

      // Return focus to the checkbox after ESC
      setTimeout(() => {
        const checkbox = document.querySelector(
          `button[aria-label="Toggle ${tasks[index].title}"]`,
        ) as HTMLButtonElement;
        if (checkbox) {
          checkbox.focus();
        }
      }, 0);
    }
  };

  return (
    <div className="mb-3 space-y-3">
      {tasks.map((task, index) => (
        <Task
          key={task.id}
          task={task}
          index={index}
          editingTaskId={editingTaskId}
          onFocus={setSelectedTaskIndex}
          onCheckboxKeyDown={onCheckboxKeyDown}
          onInputBlur={onInputBlur}
          onInputKeyDown={onInputKeyDown}
          onInputClick={onInputClick}
          onTitleChange={setEditingTitle}
          onStatusToggle={toggleTaskStatus}
          title={editingTaskId === task.id ? editingTitle : task.title}
        />
      ))}
    </div>
  );
};
