import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { DotsSixVerticalIcon } from "@phosphor-icons/react";
import classNames from "classnames";
import { type Task as ITask } from "@web/common/types/task.types";
import { Task } from "@web/views/Day/components/Task/Task";
import { type useTasks } from "@web/views/Day/hooks/tasks/useTasks";

export function DraggableTask({
  task,
  index,
  tasksProps,
}: {
  task: ITask;
  index: number;
  tasksProps: ReturnType<typeof useTasks>;
}) {
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
  } = tasksProps;
  const isDragHandleVisible = tasks.length > 1;

  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task._id,
    disabled: !isDragHandleVisible,
  });

  return (
    <div
      id={task._id}
      className="group relative select-none"
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 1 : undefined,
      }}
      ref={setNodeRef}
    >
      {isDragHandleVisible ? (
        <button
          {...attributes}
          {...listeners}
          ref={setActivatorNodeRef}
          data-task-id={task._id}
          aria-label={
            isDragging
              ? `Reordering ${task.title}. Use arrow keys to move, space to drop.`
              : `Reorder ${task.title}`
          }
          onFocus={() => setSelectedTaskIndex(index)}
          className={classNames(
            // Floats in the DropZone's pl-8 gutter so it reserves no row space
            "absolute top-1/2 right-full mr-1 -translate-y-1/2",
            "opacity-0",
            "hover:cursor-grab hover:bg-border-primary",
            "rounded-xs py-2 transition-colors",
            "hover:opacity-100 focus-visible:opacity-100 group-hover:opacity-100",
            "text-white",
            "focus-visible:bg-white/20 focus-visible:ring-2 focus-visible:ring-white/50",
            "focus:outline-none",
            {
              // A distinct accent (vs. the white focus ring) so keyboard users
              // can see the grab actually registered, not just that it's focused.
              "cursor-grabbing bg-blue-200/20 opacity-100 ring-2 ring-blue-200":
                isDragging,
            },
          )}
        >
          <DotsSixVerticalIcon size={24} />
        </button>
      ) : null}

      <Task
        task={task}
        index={index}
        isEditing={editingTaskId === task._id}
        onFocus={setSelectedTaskIndex}
        onCheckboxKeyDown={onCheckboxKeyDown}
        onInputBlur={onInputBlur}
        onInputKeyDown={onInputKeyDown}
        onInputClick={onInputClick}
        onTitleChange={onTitleChange}
        onStatusToggle={onStatusToggle}
        onMigrate={migrateTask}
        title={editingTaskId === task._id ? editingTitle : task.title}
      />
    </div>
  );
}
