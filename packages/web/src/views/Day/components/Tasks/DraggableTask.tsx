import classNames from "classnames";
import { autoUpdate, inline, offset, useFloating } from "@floating-ui/react";
import { Draggable } from "@hello-pangea/dnd";
import { DotsSixVerticalIcon } from "@phosphor-icons/react";
import { Task as ITask } from "@web/common/types/task.types";
import { getStyle } from "@web/views/Calendar/components/Sidebar/SomedayTab/SomedayEvents/SomedayEvent/styled";
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
    middleware: [offset(8), inline({})],
  });

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

  return (
    <Draggable
      draggableId={task.id}
      index={index}
      isDragDisabled={tasks.length === 1}
      disableInteractiveElementBlocking
    >
      {(draggableProvider, draggableSnapshot) => (
        <div
          {...draggableProvider.draggableProps}
          id={task.id}
          className={`group relative mr-2 select-none`}
          style={getStyle(
            draggableSnapshot,
            false,
            draggableProvider.draggableProps.style,
          )}
          ref={(e) => {
            draggableProvider.innerRef(e);
            refs.setReference(e);
            update();
          }}
        >
          <button
            {...draggableProvider.dragHandleProps}
            ref={refs.setFloating}
            style={floatingStyles}
            aria-label={`Reorder ${task.title}`}
            aria-describedby={`description-${task.id}`}
            className={classNames(
              "hover:bg-border-primary hover:cursor-grab hover:opacity-100",
              "rounded-xs py-2 transition-colors disabled:opacity-0",
              "opacity-100 group-hover:opacity-100 focus:opacity-100",
              "max-w-48 text-white",
              "focus:bg-white/20 focus:opacity-100 focus:ring-2",
              "focus:ring-white/50 focus:outline-none",
              {
                hidden: tasks.length === 1,
                "opacity-100": draggableSnapshot.isDragging,
              },
            )}
          >
            <DotsSixVerticalIcon size={24} />
          </button>

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
        </div>
      )}
    </Draggable>
  );
}
