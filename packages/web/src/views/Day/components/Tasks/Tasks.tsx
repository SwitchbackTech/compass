import { Droppable } from "@web/components/DND/Droppable";
import { DropZone } from "@web/views/Calendar/components/Sidebar/SomedayTab/SomedayEvents/SomedayEventsContainer/Dropzone";
import { DraggableTask } from "@web/views/Day/components/Task/DraggableTask";
import { useTasks } from "@web/views/Day/hooks/tasks/useTasks";

const TASK_LIST_DROPPABLE_ID = "task-list";

export const Tasks = () => {
  const tasksProps = useTasks();

  return (
    <Droppable
      dndProps={{ id: TASK_LIST_DROPPABLE_ID }}
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
