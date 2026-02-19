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
  } = tasksProps;

  return (
    <Draggable
      draggableId={task._id}
      index={index}
      isDragDisabled={tasks.length === 1}
      disableInteractiveElementBlocking
    >
      {(draggableProvider, draggableSnapshot) => (
        <div
          {...draggableProvider.draggableProps}
          id={task._id}
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
          {tasks.length > 1 ? (
            <button
              {...draggableProvider.dragHandleProps}
              ref={refs.setFloating}
              style={floatingStyles}
              aria-label={`Reorder ${task.title}`}
              aria-describedby={`description-${task._id}`}
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
                  "opacity-100":
                    draggableSnapshot.isDragging ||
                    draggableSnapshot.isDropAnimating,
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

          <div id={`description-${task._id}`} className="hidden">
            Press space to start dragging this task.
          </div>
        </div>
      )}
    </Draggable>
  );
}
