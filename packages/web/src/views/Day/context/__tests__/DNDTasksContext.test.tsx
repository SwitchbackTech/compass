import {
  type DragStart,
  type DragUpdate,
  type DropResult,
  type ResponderProvided,
} from "@hello-pangea/dnd";
import { render, screen } from "@testing-library/react";
import React from "react";
import { type useTasks as useTasksFn } from "@web/views/Day/hooks/tasks/useTasks";
import { beforeEach, describe, expect, it, mock } from "bun:test";

// Mock the useTasks hook
const mockUseTasks = mock();

mock.module("@web/views/Day/hooks/tasks/useTasks", () => ({
  useTasks: mockUseTasks,
}));

const { DNDTasksProvider } =
  require("@web/views/Day/context/DNDTasksContext") as typeof import("@web/views/Day/context/DNDTasksContext");
const { useDNDTasksContext } =
  require("@web/views/Day/hooks/tasks/useDNDTasks") as typeof import("@web/views/Day/hooks/tasks/useDNDTasks");

type DNDTasksContextValue = ReturnType<typeof useDNDTasksContext>;
type MinimalTasksContext = Pick<
  ReturnType<typeof useTasksFn>,
  "tasks" | "setSelectedTaskIndex" | "reorderTasks"
>;

describe("DNDTasksProvider", () => {
  const mockTasks = [
    {
      _id: "task-1",
      title: "Task 1",
      status: "todo" as const,
      order: 0,
      createdAt: "2024-01-01T10:00:00Z",
    },
    {
      _id: "task-2",
      title: "Task 2",
      status: "todo" as const,
      order: 1,
      createdAt: "2024-01-01T11:00:00Z",
    },
  ];

  const mockSetSelectedTaskIndex = mock();
  const mockReorderTasks = mock();

  beforeEach(() => {
    mockReorderTasks.mockClear();
    mockSetSelectedTaskIndex.mockClear();
    mockUseTasks.mockClear();
    const mockTasksContext: MinimalTasksContext = {
      tasks: mockTasks,
      setSelectedTaskIndex: mockSetSelectedTaskIndex,
      reorderTasks: mockReorderTasks,
    };

    mockUseTasks.mockReturnValue(mockTasksContext);
  });

  const provided = (announce = mock()): ResponderProvided => ({ announce });

  const dragStart = (index: number): DragStart => ({
    draggableId: `task-${index + 1}`,
    type: "task",
    source: { droppableId: "task-list", index },
    mode: "FLUID",
  });

  const dragUpdate = (
    sourceIndex: number,
    destinationIndex: number,
  ): DragUpdate => ({
    draggableId: `task-${sourceIndex + 1}`,
    type: "task",
    source: { droppableId: "task-list", index: sourceIndex },
    destination: { droppableId: "task-list", index: destinationIndex },
    combine: null,
    mode: "FLUID",
  });

  const dropResult = (
    sourceIndex: number,
    destinationIndex: number | null,
    reason: DropResult["reason"] = "DROP",
  ): DropResult => ({
    draggableId: `task-${sourceIndex + 1}`,
    type: "task",
    source: { droppableId: "task-list", index: sourceIndex },
    destination:
      destinationIndex == null
        ? null
        : { droppableId: "task-list", index: destinationIndex },
    reason,
    combine: null,
    mode: "FLUID",
  });

  it("should provide DND context to children", async () => {
    let contextValue: DNDTasksContextValue | null = null;

    const TestComponent = () => {
      contextValue = useDNDTasksContext();
      return <div data-testid="context-value">has-context</div>;
    };

    render(
      <DNDTasksProvider>
        <TestComponent />
      </DNDTasksProvider>,
    );

    expect(screen.getByTestId("context-value")).toHaveTextContent(
      "has-context",
    );
    const value = contextValue as DNDTasksContextValue | null;
    if (!value) {
      throw new Error("Expected DND tasks context to be available");
    }
    expect(typeof value.onDragStart).toBe("function");
    expect(typeof value.onDragEnd).toBe("function");
  });

  it("should call setSelectedTaskIndex and announce on drag start", () => {
    const mockAnnounce = mock();

    // Create a test component that calls the context functions directly
    let capturedContext: DNDTasksContextValue | null = null;

    const TestComponent = () => {
      capturedContext = useDNDTasksContext();

      React.useEffect(() => {
        if (capturedContext) {
          capturedContext.onDragStart(dragStart(0), provided(mockAnnounce));
        }
      }, []);

      return <div>Test</div>;
    };

    render(
      <DNDTasksProvider>
        <TestComponent />
      </DNDTasksProvider>,
    );

    expect(mockSetSelectedTaskIndex).toHaveBeenCalledWith(0);
    expect(mockAnnounce).toHaveBeenCalledWith('Started dragging task "Task 1"');
  });

  it("should call reorderTasks and announce on drag end with valid destination", () => {
    const mockAnnounce = mock();

    let capturedContext: DNDTasksContextValue | null = null;

    const TestComponent = () => {
      capturedContext = useDNDTasksContext();

      React.useEffect(() => {
        if (capturedContext) {
          capturedContext.onDragEnd(dropResult(0, 1), provided(mockAnnounce));
        }
      }, []);

      return <div>Test</div>;
    };

    render(
      <DNDTasksProvider>
        <TestComponent />
      </DNDTasksProvider>,
    );

    expect(mockReorderTasks).toHaveBeenCalledWith(0, 1);
    expect(mockAnnounce).toHaveBeenCalledWith("");
  });

  it("should announce on drag update", () => {
    const mockAnnounce = mock();

    let capturedContext: DNDTasksContextValue | null = null;

    const TestComponent = () => {
      capturedContext = useDNDTasksContext();

      React.useEffect(() => {
        if (capturedContext) {
          capturedContext.onDragUpdate(
            dragUpdate(0, 1),
            provided(mockAnnounce),
          );
        }
      }, []);

      return <div>Test</div>;
    };

    render(
      <DNDTasksProvider>
        <TestComponent />
      </DNDTasksProvider>,
    );

    expect(mockAnnounce).toHaveBeenCalledWith(
      'Dropped task "Task 1" at new position below Task 2.',
    );
  });

  it("should announce cancellation on drag end", () => {
    const mockAnnounce = mock();

    let capturedContext: DNDTasksContextValue | null = null;

    const TestComponent = () => {
      capturedContext = useDNDTasksContext();

      React.useEffect(() => {
        if (capturedContext) {
          capturedContext.onDragEnd(
            dropResult(0, null, "CANCEL"),
            provided(mockAnnounce),
          );
        }
      }, []);

      return <div>Test</div>;
    };

    render(
      <DNDTasksProvider>
        <TestComponent />
      </DNDTasksProvider>,
    );

    expect(mockAnnounce).toHaveBeenCalledWith(
      "Reordering cancelled. Task 1 returned to its original position.",
    );
  });

  it("should not call reorderTasks when destination is null", () => {
    let capturedContext: DNDTasksContextValue | null = null;

    const TestComponent = () => {
      capturedContext = useDNDTasksContext();

      React.useEffect(() => {
        if (capturedContext) {
          capturedContext.onDragEnd(dropResult(0, null), provided());
        }
      }, []);

      return <div>Test</div>;
    };

    render(
      <DNDTasksProvider>
        <TestComponent />
      </DNDTasksProvider>,
    );

    expect(mockReorderTasks).not.toHaveBeenCalled();
  });

  it("should not call reorderTasks when destination index equals source index", () => {
    let capturedContext: DNDTasksContextValue | null = null;

    const TestComponent = () => {
      capturedContext = useDNDTasksContext();

      React.useEffect(() => {
        if (capturedContext) {
          capturedContext.onDragEnd(dropResult(0, 0), provided());
        }
      }, []);

      return <div>Test</div>;
    };

    render(
      <DNDTasksProvider>
        <TestComponent />
      </DNDTasksProvider>,
    );

    expect(mockReorderTasks).not.toHaveBeenCalled();
  });
});
