import { DragDropContext, Draggable, Droppable } from "@hello-pangea/dnd";
import { DotsSixVerticalIcon } from "@phosphor-icons/react";
import IconButton from "@web/components/IconButton/IconButton";
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

  const { onDragStart, onDragEnd } = useDNDTasksContext();

  return (
    <DragDropContext onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <Droppable droppableId="task-list">
        {(provided, snapshot) => (
          <DropZone
            id="task-list-drop-zone"
            className="flex flex-col gap-2"
            ref={provided.innerRef}
            isActive={snapshot.isDraggingOver}
            {...provided.droppableProps}
          >
            {tasks.map((task, index) => (
              <Draggable
                key={task.id}
                draggableId={task.id}
                index={index}
                isDragDisabled={tasks.length === 1}
              >
                {(provided, snapshot) => (
                  <div
                    {...provided.draggableProps}
                    ref={provided.innerRef}
                    className={tasks.length > 1 ? "flex flex-row gap-2" : ""}
                    style={{
                      userSelect: "none",
                      ...getStyle(
                        snapshot,
                        false,
                        provided.draggableProps.style,
                      ),
                    }}
                  >
                    {tasks.length > 1 ? (
                      <IconButton {...provided.dragHandleProps}>
                        <DotsSixVerticalIcon />
                      </IconButton>
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
                      title={
                        editingTaskId === task.id ? editingTitle : task.title
                      }
                    />
                  </div>
                )}
              </Draggable>
            ))}

            {provided.placeholder}
          </DropZone>
        )}
      </Droppable>
    </DragDropContext>
  );
};
