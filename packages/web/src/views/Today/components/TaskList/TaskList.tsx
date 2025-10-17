import dayjs from "dayjs";
import React, { useRef, useState } from "react";
import { useTasks } from "../../context/TaskProvider";
import { AddTaskActiveButton } from "../AddTask/AddTaskActiveButton";
import { AddTaskPreviewButton } from "../AddTask/AddTaskPreviewButton";
import { TaskContextMenuWrapper } from "../ContextMenu/TaskContextMenuWrapper";
import { Tasks } from "../Tasks/Tasks";
import { useTaskListInputFocus } from "../Tasks/useTaskListInputFocus";

export function TaskList() {
  const { addTask, isAddingTask, setIsAddingTask } = useTasks();
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [isHoveringAddBlock, setIsHoveringAddBlock] = useState(false);

  const addTaskInputRef = useRef<HTMLInputElement>(null);
  const tasksScrollRef = useRef<HTMLDivElement>(null);
  const todayHeading = dayjs().locale("en").format("dddd, MMMM D");

  useTaskListInputFocus({
    isAddingTask,
    addTaskInputRef,
  });

  const beginAddingTask = () => {
    setIsAddingTask(true);
    setNewTaskTitle("");
    setIsHoveringAddBlock(false);
  };

  const handleAddTask = () => {
    if (newTaskTitle.trim()) {
      addTask(newTaskTitle.trim());
      setNewTaskTitle("");
      setIsAddingTask(false);
    }
  };

  const handleAddTaskKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleAddTask();
    } else if (e.key === "Escape") {
      setNewTaskTitle("");
      setIsAddingTask(false);
    }
  };

  const handleAddTaskBlur = () => {
    // Only exit adding mode if the field is empty
    // If there's text, let the user press Enter to add the task
    if (!newTaskTitle.trim()) {
      setIsAddingTask(false);
    }
  };

  return (
    <section
      aria-label="daily-tasks"
      className="bg-darkBlue-400 flex h-full min-w-xs flex-col border-r border-gray-400/20 text-white"
    >
      <div className="border-b border-gray-400/20 p-4">
        <h2 className="text-white-100 text-xl font-semibold" aria-live="polite">
          {todayHeading}
        </h2>
      </div>

      <div
        ref={tasksScrollRef}
        className="flex-1 overflow-y-auto p-4"
        style={{ overscrollBehavior: "contain" }}
      >
        <TaskContextMenuWrapper>
          <Tasks />
        </TaskContextMenuWrapper>

        {isAddingTask ? (
          <AddTaskActiveButton
            newTaskTitle={newTaskTitle}
            setNewTaskTitle={setNewTaskTitle}
            addTaskInputRef={addTaskInputRef}
            onAddTask={handleAddTask}
            onAddTaskKeyDown={handleAddTaskKeyDown}
            onBlur={handleAddTaskBlur}
          />
        ) : (
          <AddTaskPreviewButton
            onBeginAddingTask={beginAddingTask}
            isHoveringAddBlock={isHoveringAddBlock}
            onMouseEnter={() => setIsHoveringAddBlock(true)}
            onMouseLeave={() => setIsHoveringAddBlock(false)}
          />
        )}
      </div>
    </section>
  );
}
