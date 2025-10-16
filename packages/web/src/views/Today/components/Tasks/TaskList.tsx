import dayjs from "dayjs";
import React, { useRef, useState } from "react";
import { ID_ADD_TASK_BUTTON } from "@web/common/constants/web.constants";
import { useTasks } from "../../context/TaskProvider";
import { TaskContextMenuWrapper } from "../ContextMenu/TaskContextMenuWrapper";
import { ShortcutTip } from "../Shortcuts/ShortcutTip";
import { Tasks } from "./Tasks";
import { useTaskListInputFocus } from "./useTaskListInputFocus";

export function TaskList() {
  const { addTask, editInputRef, editingTaskId } = useTasks();
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [isHoveringAddBlock, setIsHoveringAddBlock] = useState(false);

  const addTaskInputRef = useRef<HTMLInputElement>(null);
  const tasksScrollRef = useRef<HTMLDivElement>(null);
  const todayHeading = dayjs().locale("en").format("dddd, MMMM D");

  useTaskListInputFocus({
    isAddingTask,
    editingTaskId,
    addTaskInputRef,
    editInputRef,
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
        data-testid="tasks-scroll"
        style={{ overscrollBehavior: "contain" }}
      >
        <TaskContextMenuWrapper>
          <Tasks />
        </TaskContextMenuWrapper>

        {isAddingTask ? (
          <div className="flex items-start gap-3 rounded border border-blue-200/30 bg-blue-200/5 p-2">
            <button
              type="button"
              onClick={handleAddTask}
              aria-label="Add task"
              className="mt-1"
            >
              <svg
                className="h-4 w-4 text-blue-200"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
            </button>
            <div className="flex-1">
              <input
                ref={addTaskInputRef}
                type="text"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                onKeyDown={handleAddTaskKeyDown}
                onBlur={() => {
                  if (!newTaskTitle.trim()) {
                    setIsAddingTask(false);
                  }
                }}
                placeholder="Enter task title..."
                aria-label="Task title"
                className="text-white-100 w-full bg-transparent text-sm placeholder-gray-200 outline-none"
              />
            </div>
          </div>
        ) : (
          <button
            id={ID_ADD_TASK_BUTTON}
            type="button"
            className="group flex w-full cursor-pointer items-start gap-3 rounded border border-gray-400/30 bg-gray-400/5 p-2 text-left transition-colors hover:border-blue-200/30 hover:bg-blue-200/5 focus:border-blue-200/50 focus:bg-blue-200/10 focus:ring-2 focus:ring-blue-200/30 focus:outline-none"
            onClick={beginAddingTask}
            onMouseEnter={() => setIsHoveringAddBlock(true)}
            onMouseLeave={() => setIsHoveringAddBlock(false)}
          >
            <svg
              className="h-4 w-4 text-gray-200 transition-colors group-hover:text-blue-200 group-focus:text-blue-200"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            <div className="flex flex-1 items-center justify-between">
              <span className="group-hover:text-white-100 group-focus:text-white-100 text-sm text-gray-200 transition-colors">
                Add task
              </span>
              {isHoveringAddBlock && <ShortcutTip shortcut="T" />}
            </div>
          </button>
        )}
      </div>
    </section>
  );
}
