import { AvailableTasks } from "@web/views/Now/components/AvailableTasks/AvailableTasks";
import { FocusedTask } from "@web/views/Now/components/FocusedTask/FocusedTask";
import { NoTaskAvailable } from "@web/views/Now/components/NoTaskAvailable/NoTaskAvailable";
import { useNowActions } from "@web/views/Now/hooks/useNowActions";

export const TaskSelector = () => {
  const {
    focusedTask,
    setFocusedTask,
    availableTasks,
    hasCompletedTasks,
    handlePreviousTask,
    handleNextTask,
    handleCompleteTask,
    updateTaskDescription,
  } = useNowActions();

  if (focusedTask) {
    return (
      <FocusedTask
        task={focusedTask}
        onCompleteTask={handleCompleteTask}
        onPreviousTask={handlePreviousTask}
        onNextTask={handleNextTask}
        onUpdateDescription={(description: string) =>
          updateTaskDescription(focusedTask._id, description)
        }
      />
    );
  }

  if (hasCompletedTasks || availableTasks.length === 0) {
    return <NoTaskAvailable allCompleted={hasCompletedTasks} />;
  }

  return (
    <AvailableTasks tasks={availableTasks} onTaskSelect={setFocusedTask} />
  );
};
