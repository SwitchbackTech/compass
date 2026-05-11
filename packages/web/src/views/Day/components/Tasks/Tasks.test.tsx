import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { type ReactNode } from "react";
import { afterAll, describe, expect, it, mock } from "bun:test";

const useTasksMock = mock();

mock.module("@hello-pangea/dnd", () => ({
  DragDropContext: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  Droppable: ({
    children,
  }: {
    children: (
      provided: {
        droppableProps: Record<string, never>;
        innerRef: () => void;
        placeholder: null;
      },
      snapshot: { isDraggingOver: boolean },
    ) => ReactNode;
  }) => (
    <div>
      {children(
        {
          droppableProps: {},
          innerRef: () => {},
          placeholder: null,
        },
        { isDraggingOver: false },
      )}
    </div>
  ),
}));

mock.module("@web/views/Day/hooks/tasks/useDNDTasks", () => ({
  useDNDTasksContext: () => ({
    onDragEnd: mock(),
    onDragStart: mock(),
    onDragUpdate: mock(),
  }),
}));

mock.module("@web/views/Day/hooks/tasks/useTasks", () => ({
  useTasks: useTasksMock,
}));

mock.module("@web/views/Day/components/Task/DraggableTask", () => ({
  DraggableTask: () => <div>Task</div>,
}));

const { Tasks } = require("./Tasks") as typeof import("./Tasks");

describe("Tasks", () => {
  it("does not show loading text during date switches after tasks have loaded once", () => {
    useTasksMock.mockReturnValue({
      hasLoadedTasksOnce: true,
      isLoadingTasks: true,
      tasks: [],
    });

    render(<Tasks />);

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.getByText("No tasks yet")).toBeInTheDocument();
  });
});

afterAll(() => {
  mock.restore();
});
