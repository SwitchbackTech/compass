import { useNowActions } from "@web/views/Now/hooks/useNowActions";
import { AllTasksCompleted } from "../AllTasksCompleted/AllTasksCompleted";
import { AvailableTasks } from "../AvailableTasks/AvailableTasks";
import { FocusedTask } from "../FocusedTask/FocusedTask";

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
          updateTaskDescription(focusedTask.id, description)
        }
      />
    );
  }

  if (hasCompletedTasks) {
    return <AllTasksCompleted />;
  }

  if (availableTasks.length === 0) {
    return null;
  }

  return (
    <AvailableTasks tasks={availableTasks} onTaskSelect={setFocusedTask} />
  );
};
