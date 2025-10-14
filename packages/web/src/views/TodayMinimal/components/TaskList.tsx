import React, { useRef, useState } from "react";
import { useTodayMinimal } from "../context/TodayMinimalProvider";
import { useAutofocus } from "../hooks/useAutofocus";
import { Task } from "../types";

interface TaskListProps {
  onTaskFocus?: (taskId: string | null) => void;
  focusedTaskId?: string | null;
  onSelectTask?: (index: number) => void;
  selectedTaskIndex?: number;
}

export function TaskList({
  onTaskFocus,
  focusedTaskId,
  onSelectTask,
  selectedTaskIndex = 0,
}: TaskListProps) {
  const { tasks, addTask, updateTaskTitle, toggleTaskStatus } =
    useTodayMinimal();
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [isHoveringAddBlock, setIsHoveringAddBlock] = useState(false);
  const [selectedPriority, setSelectedPriority] = useState<
    "all" | Task["priority"]
  >("all");

  const editInputRef = useRef<HTMLInputElement>(null);
  const addTaskInputRef = useRef<HTMLInputElement>(null);
  const tasksScrollRef = useRef<HTMLDivElement>(null);

  // Filter tasks by priority
  const filteredTasks = tasks.filter(
    (task) => selectedPriority === "all" || task.priority === selectedPriority,
  );

  // Auto-focus edit input
  useAutofocus({
    shouldFocus: !!editingTaskId,
    inputRef: editInputRef,
    selectText: true,
    preventScroll: true,
    dependencies: [editingTaskId],
  });

  // Auto-focus add task input
  useAutofocus({
    shouldFocus: isAddingTask,
    inputRef: addTaskInputRef,
    selectText: false,
    dependencies: [isAddingTask],
  });

  const getPriorityColor = (priority: Task["priority"]) => {
    switch (priority) {
      case "Work":
        return "border-blue-300/30 bg-blue-300/5";
      case "Self":
        return "border-green/30 bg-green/5";
      case "Relationships":
        return "border-purple/30 bg-purple/5";
      default:
        return "border-gray-400/30 bg-gray-400/5";
    }
  };

  const handleAddTask = () => {
    if (newTaskTitle.trim()) {
      addTask(newTaskTitle.trim(), "Work", "General");
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

  const todayHeading = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="flex h-full flex-col bg-darkBlue-400 border-r border-gray-400/20">
      <div className="p-4 border-b border-gray-400/20">
        <h2
          className="text-xl font-semibold text-white-100 mb-3"
          aria-live="polite"
        >
          {todayHeading}
        </h2>

        {/* Priority filter */}
        <div className="flex gap-2">
          {(["all", "Work", "Self", "Relationships"] as const).map(
            (priority) => (
              <button
                key={priority}
                onClick={() => setSelectedPriority(priority)}
                className={`px-3 py-1 text-xs rounded-full transition-colors ${
                  selectedPriority === priority
                    ? "bg-blue-200 text-white-100"
                    : "bg-gray-400/20 text-gray-200 hover:bg-gray-400/30"
                }`}
              >
                {priority === "all" ? "All" : priority}
              </button>
            ),
          )}
        </div>
      </div>

      <div
        ref={tasksScrollRef}
        className="flex-1 overflow-y-auto p-4"
        data-testid="tasks-scroll"
        style={{ overscrollBehavior: "contain" }}
      >
        <div className="space-y-3">
          {filteredTasks.map((task, index) => (
            <div
              key={task.id}
              className={`flex items-start gap-3 p-2 rounded border ${getPriorityColor(
                task.priority,
              )} group ${task.status === "completed" ? "opacity-50" : ""}`}
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
                className="mt-1 focus:outline-none focus:ring-2 focus:ring-blue-200 rounded-full"
              >
                {task.status === "completed" ? (
                  <svg
                    className="w-4 h-4 text-green"
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
                    className="w-4 h-4 text-gray-200 opacity-0 group-hover:opacity-100 transition-opacity"
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
                    className="w-full bg-transparent text-sm text-white-100 placeholder-gray-200 outline-none border-b border-white-100/20"
                    aria-label={`Edit ${task.title}`}
                  />
                ) : (
                  <p
                    className="text-sm text-white-100 leading-relaxed cursor-text"
                    onClick={() => {
                      setEditingTaskId(task.id);
                      setEditingTitle(task.title);
                    }}
                  >
                    {task.title}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-gray-300">{task.category}</span>
                  <span className="text-xs text-gray-400">•</span>
                  <span className="text-xs text-gray-300">{task.priority}</span>
                  {task.estimatedTime > 0 && (
                    <>
                      <span className="text-xs text-gray-400">•</span>
                      <span className="text-xs text-gray-300">
                        {task.estimatedTime}m
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}

          {isAddingTask ? (
            <div className="flex items-start gap-3 p-2 rounded border border-blue-200/30 bg-blue-200/5">
              <button onClick={handleAddTask} className="mt-1">
                <svg
                  className="w-4 h-4 text-blue-200"
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
                  tabIndex={-1}
                  onBlur={() => {
                    if (!newTaskTitle.trim()) {
                      setIsAddingTask(false);
                    }
                  }}
                  placeholder="Enter task title..."
                  className="w-full bg-transparent text-sm text-white-100 placeholder-gray-200 outline-none"
                />
              </div>
            </div>
          ) : (
            <div
              className="flex items-start gap-3 p-2 rounded border border-gray-400/30 bg-gray-400/5 cursor-pointer hover:border-blue-200/30 hover:bg-blue-200/5 transition-colors group"
              onClick={() => setIsAddingTask(true)}
              onMouseEnter={() => setIsHoveringAddBlock(true)}
              onMouseLeave={() => setIsHoveringAddBlock(false)}
            >
              <svg
                className="w-4 h-4 text-gray-200 group-hover:text-blue-200 mt-1 transition-colors"
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
              <div className="flex-1 flex items-center justify-between">
                <span className="text-sm text-gray-200 group-hover:text-white-100 transition-colors">
                  Add task
                </span>
                {isHoveringAddBlock && (
                  <span className="text-xs text-gray-300 bg-gray-400 px-1.5 py-0.5 rounded">
                    T
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
