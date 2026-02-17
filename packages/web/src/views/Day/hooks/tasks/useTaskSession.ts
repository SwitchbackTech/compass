import { useEffect, useSyncExternalStore } from "react";
import { TaskSessionService } from "@web/views/Day/tasks/task-session.service";

interface UseTaskSessionProps {
  taskSession: TaskSessionService;
  dateKey: string;
}

export function useTaskSession({ taskSession, dateKey }: UseTaskSessionProps) {
  const snapshot = useSyncExternalStore(
    taskSession.subscribe,
    taskSession.getSnapshot,
    taskSession.getSnapshot,
  );

  useEffect(() => {
    void taskSession.openDate(dateKey);
  }, [taskSession, dateKey]);

  useEffect(() => {
    return () => {
      void taskSession.flush();
    };
  }, [taskSession]);

  return {
    ...snapshot,
    updateTasks: taskSession.updateTasks,
    moveTask: taskSession.moveTask,
    flush: taskSession.flush,
  };
}
