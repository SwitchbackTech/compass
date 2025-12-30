import { ID_DROPPABLE_TASKS } from "@web/common/constants/web.constants";
import { Droppable } from "@web/components/DND/Droppable";
import { DropZone } from "@web/views/Calendar/components/Sidebar/SomedayTab/SomedayEvents/SomedayEventsContainer/Dropzone";
import { DraggableTask } from "@web/views/Day/components/Task/DraggableTask";
import { useTasks } from "@web/views/Day/hooks/tasks/useTasks";

export const Tasks = () => {
  const tasksProps = useTasks();

  return (
    <Droppable
      dndProps={{ id: ID_DROPPABLE_TASKS }}
      as="div"
      className="flex flex-col gap-2 overflow-y-auto overscroll-contain"
      style={{ scrollbarGutter: "stable both-edges" }}
      role="list"
      aria-label="Task list"
      id="task-list-drop-zone"
    >
      {tasksProps.tasks.map((task, index) => (
        <DraggableTask
          key={task.id}
          task={task}
          index={index}
          tasksProps={tasksProps}
        />
      ))}
    </Droppable>
  );
};
