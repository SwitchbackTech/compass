import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  type DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  restrictToParentElement,
  restrictToVerticalAxis,
} from "@dnd-kit/modifiers";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useCallback, useMemo, useState } from "react";
import { DropZone } from "@web/components/DND/DropZone";
import { DraggableTask } from "@web/views/Day/components/Task/DraggableTask";
import {
  buildTaskDndAnnouncements,
  TASK_DND_SCREEN_READER_INSTRUCTIONS,
} from "@web/views/Day/components/Tasks/taskDnd.announcements";
import { useTasks } from "@web/views/Day/hooks/tasks/useTasks";

export const Tasks = () => {
  const tasksProps = useTasks();
  const { tasks, reorderTasks, setSelectedTaskIndex } = tasksProps;
  const [isDragging, setIsDragging] = useState(false);
  const isInitialLoad =
    tasksProps.isLoadingTasks && !tasksProps.hasLoadedTasksOnce;

  const sensors = useSensors(
    // The distance constraint keeps clicks (edit, checkbox) from being
    // swallowed by an accidental micro-drag.
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const taskIds = useMemo(() => tasks.map((task) => task._id), [tasks]);
  const announcements = useMemo(
    () => buildTaskDndAnnouncements(tasks),
    [tasks],
  );

  const onDragStart = useCallback(
    ({ active }: DragStartEvent) => {
      setIsDragging(true);

      const index = tasks.findIndex((task) => task._id === active.id);

      if (index !== -1) {
        setSelectedTaskIndex(index);
      }
    },
    [tasks, setSelectedTaskIndex],
  );

  const onDragEnd = useCallback(
    ({ active, over }: DragEndEvent) => {
      setIsDragging(false);

      if (!over) return;

      const sourceIndex = tasks.findIndex((task) => task._id === active.id);
      const destinationIndex = tasks.findIndex((task) => task._id === over.id);

      if (
        sourceIndex === -1 ||
        destinationIndex === -1 ||
        sourceIndex === destinationIndex
      ) {
        return;
      }

      reorderTasks(sourceIndex, destinationIndex);
    },
    [tasks, reorderTasks],
  );

  const onDragCancel = useCallback(() => setIsDragging(false), []);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis, restrictToParentElement]}
      accessibility={{
        announcements,
        screenReaderInstructions: TASK_DND_SCREEN_READER_INSTRUCTIONS,
      }}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={onDragCancel}
    >
      <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
        <DropZone
          id="task-list-drop-zone"
          role="list"
          aria-label="Task list"
          className="flex flex-col gap-2 overflow-y-auto overscroll-contain"
          isActive={isDragging}
        >
          {isInitialLoad ? (
            <p
              className="px-2 py-1 text-sm text-text-light-inactive"
              role="status"
            >
              Loading tasks&hellip;
            </p>
          ) : tasksProps.tasks.length === 0 ? (
            <p className="px-2 py-1 text-sm text-text-light-inactive">
              No tasks yet
            </p>
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
        </DropZone>
      </SortableContext>
    </DndContext>
  );
};
