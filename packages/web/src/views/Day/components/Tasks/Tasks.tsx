import { DragDropContext, Draggable, Droppable } from "@hello-pangea/dnd";
import { DotsSixVerticalIcon } from "@phosphor-icons/react";
import { theme } from "@web/common/styles/theme";
import { getStyle } from "@web/views/Calendar/components/Sidebar/SomedayTab/SomedayEvents/SomedayEvent/styled";
import { DropZone } from "@web/views/Calendar/components/Sidebar/SomedayTab/SomedayEvents/SomedayEventsContainer/Dropzone";
import { Task } from "@web/views/Day/components/Task/Task";
import { useDNDTasksContext } from "@web/views/Day/hooks/tasks/useDNDTasks";
import { useTasks } from "@web/views/Day/hooks/tasks/useTasks";

export const Tasks = () => {
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
  } = useTasks();

  const { onDragStart, onDragUpdate, onDragEnd } = useDNDTasksContext();

  return (
    <DragDropContext
      onDragStart={onDragStart}
      onDragUpdate={onDragUpdate}
      onDragEnd={onDragEnd}
      dragHandleUsageInstructions="use arrow keys to move, space to drop, or escape to cancel. Ensure your screen reader is in focus mode or forms mode"
    >
      <Droppable droppableId="task-list">
        {(droppableProvider, droppableSnapshot) => (
          <DropZone
            id="task-list-drop-zone"
            className="flex flex-col gap-2"
            ref={droppableProvider.innerRef}
            isActive={droppableSnapshot.isDraggingOver}
            {...droppableProvider.droppableProps}
          >
            {tasks.map((task, index) => (
              <Draggable
                key={task.id}
                draggableId={task.id}
                index={index}
                isDragDisabled={tasks.length === 1}
                disableInteractiveElementBlocking
              >
                {(draggableProvider, draggableSnapshot) => (
                  <div
                    {...draggableProvider.draggableProps}
                    ref={draggableProvider.innerRef}
                    className={tasks.length > 1 ? "flex flex-row gap-2" : ""}
                    style={{
                      userSelect: "none",
                      ...getStyle(
                        draggableSnapshot,
                        false,
                        draggableProvider.draggableProps.style,
                      ),
                    }}
                  >
                    {tasks.length > 1 ? (
                      <button
                        {...draggableProvider.dragHandleProps}
                        className="hover:bg-border-primary flex cursor-grab items-center justify-center text-white transition-colors hover:scale-105 focus:bg-white/20 focus:ring-2 focus:ring-white/50 focus:outline-none active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
                        aria-label={`Reorder ${task.title} button.`}
                        aria-describedby={`description-${task.id}`}
                        style={{
                          borderRadius: theme.shape.borderRadius,
                          border: "2px solid transparent",
                        }}
                      >
                        <DotsSixVerticalIcon />
                      </button>
                    ) : null}

                    <Task
                      key={task.id}
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
                      title={
                        editingTaskId === task.id ? editingTitle : task.title
                      }
                    />
                    <div id={`description-${task.id}`} className="hidden">
                      Press space to start dragging this task.
                    </div>
                  </div>
                )}
              </Draggable>
            ))}

            {droppableProvider.placeholder}
          </DropZone>
        )}
      </Droppable>
    </DragDropContext>
  );
};
