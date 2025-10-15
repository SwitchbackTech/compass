import dayjs from "dayjs";
import React, { useRef, useState } from "react";
import { useTasks } from "../context/TaskProvider";
import { useTaskListInputFocus } from "./useTaskListInputFocus";

interface TaskListProps {
  onTaskFocus?: (taskId: string | null) => void;
  focusedTaskId?: string | null;
  onSelectTask?: (index: number) => void;
  selectedTaskIndex?: number;
}

export function TaskList({ onTaskFocus, onSelectTask }: TaskListProps) {
  const { tasks, addTask, updateTaskTitle, toggleTaskStatus } = useTasks();
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [isHoveringAddBlock, setIsHoveringAddBlock] = useState(false);

  const editInputRef = useRef<HTMLInputElement>(null);
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
    <div className="bg-darkBlue-400 flex h-full min-w-xs flex-col border-r border-gray-400/20 text-white">
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
        <div className="space-y-3">
          {tasks.map((task, index) => (
            <div
              key={task.id}
              className={`group flex items-start gap-3 rounded border p-2 ${task.status === "completed" ? "opacity-50" : ""}`}
            >
              <button
                data-task-id={task.id}
                role="checkbox"
                aria-checked={task.status === "completed"}
                aria-label={`Toggle ${task.title}`}
                tabIndex={0}
                onFocus={() => {
                  onSelectTask?.(index);
                  onTaskFocus?.(task.id);
                }}
                onBlur={(e) => {
                  const next = e.relatedTarget as HTMLElement | null;
                  if (!next?.dataset?.taskId) {
                    onTaskFocus?.(null);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === " " || e.key === "Enter") {
                    e.preventDefault();
                    toggleTaskStatus(task.id);
                  }
                }}
                onClick={() => toggleTaskStatus(task.id)}
                className="mt-1 rounded-full focus:ring-2 focus:ring-blue-200 focus:outline-none"
              >
                {task.status === "completed" ? (
                  <svg
                    className="text-green h-4 w-4"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : (
                  <svg
                    className="h-4 w-4 text-gray-200 opacity-0 transition-opacity group-hover:opacity-100"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <circle cx="12" cy="12" r="10" strokeWidth="2" />
                  </svg>
                )}
              </button>
              <div className="flex-1">
                {editingTaskId === task.id ? (
                  <input
                    ref={editInputRef}
                    type="text"
                    value={editingTitle}
                    onChange={(e) => setEditingTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        updateTaskTitle(
                          task.id,
                          editingTitle.trim() || task.title,
                        );
                        setEditingTaskId(null);
                        setEditingTitle("");
                      } else if (e.key === "Escape") {
                        setEditingTaskId(null);
                        setEditingTitle("");
                      }
                    }}
                    onBlur={() => {
                      if (editingTitle.trim()) {
                        updateTaskTitle(task.id, editingTitle.trim());
                      }
                      setEditingTaskId(null);
                      setEditingTitle("");
                    }}
                    className="text-white-100 border-white-100/20 w-full border-b bg-transparent text-sm placeholder-gray-200 outline-none"
                    aria-label={`Edit ${task.title}`}
                  />
                ) : (
                  <p
                    className="text-white-100 cursor-text text-sm leading-relaxed"
                    onClick={() => {
                      setEditingTaskId(task.id);
                      setEditingTitle(task.title);
                    }}
                  >
                    {task.title}
                  </p>
                )}
              </div>
            </div>
          ))}

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
              type="button"
              className="group flex w-full cursor-pointer items-start gap-3 rounded border border-gray-400/30 bg-gray-400/5 p-2 text-left transition-colors hover:border-blue-200/30 hover:bg-blue-200/5"
              onClick={beginAddingTask}
              onMouseEnter={() => setIsHoveringAddBlock(true)}
              onMouseLeave={() => setIsHoveringAddBlock(false)}
            >
              <svg
                className="h-4 w-4 text-gray-200 transition-colors group-hover:text-blue-200"
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
                <span className="group-hover:text-white-100 text-sm text-gray-200 transition-colors">
                  Add task
                </span>
                {isHoveringAddBlock && (
                  <span className="rounded bg-gray-400 px-1.5 py-0.5 text-xs text-gray-300">
                    T
                  </span>
                )}
              </div>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
