import { useAvailableTasks } from "@web/views/Now/hooks/useAvailableTasks";
import { useFocusedTask } from "@web/views/Now/hooks/useFocusedTask";
import { AvailableTasks } from "../AvailableTasks/AvailableTasks";
import { FocusedTask } from "../FocusedTask/FocusedTask";

export const TaskSelector = () => {
  const { focusedTask, setFocusedTask } = useFocusedTask();
  const { availableTasks } = useAvailableTasks();

  const handleSelectTask = (taskId: string) => {
    setFocusedTask(taskId);
  };

  if (focusedTask) {
    return <FocusedTask task={focusedTask} />;
  }

  return (
    <AvailableTasks tasks={availableTasks} onSelectTask={handleSelectTask} />
  );
};
