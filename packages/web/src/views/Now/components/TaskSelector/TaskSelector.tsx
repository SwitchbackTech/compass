import { useCallback, useState } from "react";
import { AvailableTasks } from "@web/views/Now/components/AvailableTasks/AvailableTasks";
import { FocusedTask } from "@web/views/Now/components/FocusedTask/FocusedTask";
import { NoTaskAvailable } from "@web/views/Now/components/NoTaskAvailable/NoTaskAvailable";
import { useNowActions } from "@web/views/Now/hooks/useNowActions";
import { useNowShortcuts } from "@web/views/Now/shortcuts/useNowShortcuts";

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
    updateTaskTitle,
  } = useNowActions();
  const [titleEditRequestKey, setTitleEditRequestKey] = useState(0);
  const [descriptionEditRequestKey, setDescriptionEditRequestKey] = useState(0);
  const [descriptionSaveRequestKey, setDescriptionSaveRequestKey] = useState(0);

  const requestTitleEdit = useCallback(() => {
    setTitleEditRequestKey((currentValue) => currentValue + 1);
  }, []);

  const requestDescriptionEdit = useCallback(() => {
    setDescriptionEditRequestKey((currentValue) => currentValue + 1);
  }, []);

  const requestDescriptionSave = useCallback(() => {
    setDescriptionSaveRequestKey((currentValue) => currentValue + 1);
  }, []);

  useNowShortcuts({
    focusedTask,
    availableTasks,
    onPreviousTask: handlePreviousTask,
    onNextTask: handleNextTask,
    onCompleteTask: handleCompleteTask,
    onEditDescription: requestDescriptionEdit,
    onEditTitle: requestTitleEdit,
    onSaveDescription: requestDescriptionSave,
  });

  if (focusedTask) {
    return (
      <FocusedTask
        task={focusedTask}
        onCompleteTask={handleCompleteTask}
        onPreviousTask={handlePreviousTask}
        onNextTask={handleNextTask}
        titleEditRequestKey={titleEditRequestKey}
        descriptionEditRequestKey={descriptionEditRequestKey}
        descriptionSaveRequestKey={descriptionSaveRequestKey}
        onUpdateTitle={(title: string) => updateTaskTitle(focusedTask, title)}
        onUpdateDescription={(description: string) =>
          updateTaskDescription(focusedTask, description)
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
