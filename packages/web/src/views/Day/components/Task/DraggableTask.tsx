import classNames from "classnames";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { autoUpdate, inline, offset, useFloating } from "@floating-ui/react";
import { DotsSixVerticalIcon } from "@phosphor-icons/react";
import { Task as ITask } from "@web/common/types/task.types";
import { Draggable } from "@web/components/DND/Draggable";
import { Task } from "@web/views/Day/components/Task/Task";
import { useTasks } from "@web/views/Day/hooks/tasks/useTasks";

export function DraggableTask({
  task,
  index,
  tasksProps,
}: {
  task: ITask;
  index: number;
  tasksProps: ReturnType<typeof useTasks>;
}) {
  const { refs, floatingStyles, update } = useFloating({
    open: true,
    whileElementsMounted: autoUpdate,
    strategy: "fixed",
    placement: "left",
    transform: false,
    middleware: [offset(8), inline({})],
  });

  const {
    tasks,
    editingTaskId,
    editingTitle,
    setSelectedTaskIndex,
    onCheckboxKeyDown,
    onInputBlur,
    focusOnInput,
    onInputClick,
    onInputKeyDown,
    onTitleChange,
    onStatusToggle,
    migrateTask,
    deleteTask,
  } = tasksProps;

  return (
    <Draggable
      dndProps={{
        id: task.id,
        data: {
          type: "task",
          task,
          view: "day",
          deleteTask: () => deleteTask(task.id),
        },
        disabled: tasks.length === 1,
      }}
      as="div"
      id={task.id}
      className={`group relative mr-2 select-none`}
      ref={(e) => {
        refs.setReference(e);
        update();
      }}
    >
      {tasks.length > 1 ? (
        <button
          ref={refs.setFloating}
          style={floatingStyles}
          aria-label={`Reorder ${task.title}`}
          aria-describedby={`description-${task.id}`}
          onFocus={() => setSelectedTaskIndex(index)}
          className={classNames(
            "opacity-0",
            "hover:bg-border-primary hover:cursor-grab",
            "rounded-xs py-2 transition-colors",
            "group-hover:opacity-100 hover:opacity-100 focus:opacity-100",
            "max-w-48 text-white",
            "focus:bg-white/20 focus:ring-2 focus:ring-white/50",
            "focus:outline-none disabled:cursor-default disabled:opacity-0",
            {
              hidden: tasks.length === 1,
            },
          )}
        >
          <DotsSixVerticalIcon size={24} />
        </button>
      ) : null}

      <Task
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

      <div id={`description-${task.id}`} className="hidden">
        Press space to start dragging this task.
      </div>
    </Draggable>
  );
}
