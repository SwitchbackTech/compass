import React from "react";
import { useTasks } from "../../hooks/tasks/useTasks";
import { Task } from "../Task/Task";

export const Tasks = () => {
  const {
    tasks,
    editingTaskId,
    editingTitle,
    setSelectedTaskIndex,
    onCheckboxKeyDown,
    onInputBlur,
    onInputClick,
    onInputKeyDown,
    onTitleChange,
    onStatusToggle,
    migrateTask,
  } = useTasks();

  return (
    <div className="mb-3 space-y-3">
      {tasks.map((task, index) => (
        <Task
          key={task.id}
          task={task}
          index={index}
          isEditing={editingTaskId === task.id}
          onFocus={setSelectedTaskIndex}
          onCheckboxKeyDown={onCheckboxKeyDown}
          onInputBlur={onInputBlur}
          onInputKeyDown={onInputKeyDown}
          onInputClick={onInputClick}
          onTitleChange={onTitleChange}
          onStatusToggle={onStatusToggle}
          onMigrate={migrateTask}
          title={editingTaskId === task.id ? editingTitle : task.title}
        />
      ))}
    </div>
  );
};
