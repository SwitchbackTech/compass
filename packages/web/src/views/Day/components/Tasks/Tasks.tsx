import { DragDropContext, Droppable } from "@hello-pangea/dnd";
import { DropZone } from "@web/views/Calendar/components/Sidebar/SomedayTab/SomedayEvents/SomedayEventsContainer/Dropzone";
import { DraggableTask } from "@web/views/Day/components/Task/DraggableTask";
import { useDNDTasksContext } from "@web/views/Day/hooks/tasks/useDNDTasks";
import { useTasks } from "@web/views/Day/hooks/tasks/useTasks";

export const Tasks = () => {
  const tasksProps = useTasks();
  const { onDragStart, onDragUpdate, onDragEnd } = useDNDTasksContext();

  return (
    <DragDropContext
      onDragStart={onDragStart}
      onDragUpdate={onDragUpdate}
      onDragEnd={onDragEnd}
      dragHandleUsageInstructions="use arrow keys to move, space to drop, or escape to cancel"
    >
      <Droppable droppableId="task-list">
        {(droppableProvider, droppableSnapshot) => (
          <DropZone
            id="task-list-drop-zone"
            role="list"
            aria-label="Task list"
            className="flex flex-col gap-2 overflow-y-auto overscroll-contain"
            ref={droppableProvider.innerRef}
            isActive={droppableSnapshot.isDraggingOver}
            {...droppableProvider.droppableProps}
            style={{ scrollbarGutter: "stable both-edges" }}
          >
            {tasksProps.isLoadingTasks ? (
              <p className="px-2 py-1 text-sm text-gray-100/70" role="status">
                Loading tasks...
              </p>
            ) : tasksProps.tasks.length === 0 ? (
              <p className="px-2 py-1 text-sm text-gray-100/70">No tasks yet</p>
            ) : (
              tasksProps.tasks.map((task, index) => (
                <DraggableTask
                  key={task._id}
                  task={task}
                  index={index}
                  tasksProps={tasksProps}
                />
              ))
            )}

            {droppableProvider.placeholder}
          </DropZone>
        )}
      </Droppable>
    </DragDropContext>
  );
};
