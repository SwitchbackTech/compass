import { PropsWithChildren, createContext, useCallback } from "react";
import {
  DragStart,
  DragUpdate,
  DropResult,
  OnDragEndResponder,
  OnDragStartResponder,
  OnDragUpdateResponder,
  ResponderProvided,
} from "@hello-pangea/dnd";
import { useTasks } from "@web/views/Day/hooks/tasks/useTasks";

interface DNDTasksContextProps {
  onDragStart: OnDragStartResponder;
  onDragUpdate: OnDragUpdateResponder;
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

  const onDragUpdate = useCallback(
    (result: DragUpdate, provided: ResponderProvided) => {
      const { destination, source } = result;

      if (!destination) return provided.announce("");

      const originalPosition = destination.index === source.index;
      const task = tasks[source.index];
      const replaceTask = tasks[destination.index];
      const at = originalPosition ? "old" : "new";
      const _suffix = destination.index < source.index ? "above" : "below";
      const suffix = replaceTask?.title.length > 0 ? ` ${_suffix}` : "";
      const replaceTitle = replaceTask?.title;
      const metaSuffix = originalPosition ? "" : `${suffix} ${replaceTitle}`;

      provided.announce(
        `Dropped task "${task.title}" at ${at} position${metaSuffix}.`,
      );
    },
    [tasks],
  );

  const onDragEnd = useCallback(
    (result: DropResult, provided: ResponderProvided) => {
      const { destination, source, reason } = result;
      const task = tasks[source.index];

      if (reason === "CANCEL") {
        return provided.announce(
          `Reordering cancelled. ${task.title} returned to its original position.`,
        );
      }

      if (!destination) {
        return provided.announce(
          `Invalid drop destination. ${task.title} returned to its original position.`,
        );
      }

      if (destination.index !== source.index) {
        reorderTasks(source.index, destination.index);

        provided.announce("");
      }
    },
    [tasks, reorderTasks],
  );

  const value: DNDTasksContextProps = {
    onDragStart,
    onDragUpdate,
    onDragEnd,
  };

  return (
    <DNDTasksContext.Provider value={value}>
      {children}
    </DNDTasksContext.Provider>
  );
}
