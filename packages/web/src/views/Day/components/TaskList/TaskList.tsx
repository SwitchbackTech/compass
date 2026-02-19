import React, { useRef, useState } from "react";
import { AddTaskActiveButton } from "@web/views/Day/components/AddTask/AddTaskActiveButton";
import { AddTaskPreviewButton } from "@web/views/Day/components/AddTask/AddTaskPreviewButton";
import { TaskContextMenuWrapper } from "@web/views/Day/components/ContextMenu/TaskContextMenuWrapper";
import { TaskListHeader } from "@web/views/Day/components/TaskList/TaskListHeader";
import { Tasks } from "@web/views/Day/components/Tasks/Tasks";
import { useTaskListInputFocus } from "@web/views/Day/components/Tasks/useTaskListInputFocus";
import { DNDTasksProvider } from "@web/views/Day/context/DNDTasksContext";
import { useTasks } from "@web/views/Day/hooks/tasks/useTasks";

export function TaskList() {
  const { addTask, isAddingTask, isLoadingTasks, setIsAddingTask } = useTasks();
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [isHoveringAddBlock, setIsHoveringAddBlock] = useState(false);

  const addTaskInputRef = useRef<HTMLInputElement>(null);
  const tasksScrollRef = useRef<HTMLDivElement>(null);

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
    if (isLoadingTasks) return;

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
      className="bg-darkBlue-400 flex h-full min-w-xs flex-1 flex-col border-r border-gray-400/20 text-white"
    >
      <TaskListHeader />

      <div
        ref={tasksScrollRef}
        className="flex flex-1 flex-col gap-2 overflow-hidden p-4"
      >
        <TaskContextMenuWrapper>
          <DNDTasksProvider>
            <Tasks />
          </DNDTasksProvider>
        </TaskContextMenuWrapper>

        <div className="mr-4 ml-2">
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
      </div>
    </section>
  );
}
