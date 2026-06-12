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
      className="group relative mr-2 grid select-none grid-cols-[2rem_minmax(0,1fr)] items-center gap-2"
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
          aria-label={`Reorder ${task.title}`}
          onFocus={() => setSelectedTaskIndex(index)}
          className={classNames(
            "justify-self-end",
            "opacity-0",
            "hover:cursor-grab hover:bg-border-primary",
            "rounded-xs py-2 transition-colors",
            "hover:opacity-100 focus-visible:opacity-100 group-hover:opacity-100",
            "max-w-48 text-white",
            "focus-visible:bg-white/20 focus-visible:ring-2 focus-visible:ring-white/50",
            "focus:outline-none disabled:cursor-default disabled:opacity-0",
            {
              hidden: tasks.length === 1,
              "cursor-grabbing opacity-100": isDragging,
            },
          )}
        >
          <DotsSixVerticalIcon size={24} />
        </button>
      ) : (
        <span aria-hidden="true" />
      )}

      <div className="min-w-0">
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
    </div>
  );
}
