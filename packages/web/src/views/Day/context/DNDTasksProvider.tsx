import { PropsWithChildren, createContext, useCallback } from "react";
import {
  DragStart,
  DropResult,
  OnDragEndResponder,
  OnDragStartResponder,
  ResponderProvided,
} from "@hello-pangea/dnd";
import { useTasks } from "@web/views/Day/hooks/tasks/useTasks";

interface DNDTasksContextProps {
  onDragStart: OnDragStartResponder;
  onDragEnd: OnDragEndResponder;
}

export const DNDTasksContext = createContext<DNDTasksContextProps | null>(null);

export function DNDTasksProvider({ children }: PropsWithChildren) {
  const { tasks, setSelectedTaskIndex, reorderTasks } = useTasks();

  const onDragStart = useCallback(
    (initial: DragStart, provided: ResponderProvided) => {
      const { source } = initial;
      const task = tasks[source.index];

      setSelectedTaskIndex(source.index);
      provided.announce(`Started dragging task "${task?.title}"`);
    },
    [tasks, setSelectedTaskIndex],
  );

  const onDragEnd = useCallback(
    (result: DropResult, provided: ResponderProvided) => {
      const { destination, source } = result;

      if (!destination || destination.index === source.index) return;

      const task = tasks[source.index];
      const aboveTask = tasks[source.index - 1];
      const belowTask = tasks[source.index + 1];
      const aboveText = aboveTask ? ` below "${aboveTask?.title}"` : "";
      const belowText = belowTask ? ` above "${belowTask?.title}"` : "";

      reorderTasks(source.index, destination.index);

      provided.announce(
        `Dropped task "${task.title}" at new position${aboveText}${belowText}.`,
      );
    },
    [tasks, reorderTasks],
  );

  const value: DNDTasksContextProps = {
    onDragStart,
    onDragEnd,
  };

  return (
    <DNDTasksContext.Provider value={value}>
      {children}
    </DNDTasksContext.Provider>
  );
}
