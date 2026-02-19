import React, { act } from "react";
import { render, screen } from "@testing-library/react";
import { DNDTasksProvider } from "@web/views/Day/context/DNDTasksContext";
import { useDNDTasksContext } from "@web/views/Day/hooks/tasks/useDNDTasks";
import { useTasks } from "@web/views/Day/hooks/tasks/useTasks";

// Mock the useTasks hook
jest.mock("@web/views/Day/hooks/tasks/useTasks", () => ({
  useTasks: jest.fn(),
}));

const mockUseTasks = useTasks as jest.MockedFunction<typeof useTasks>;

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

  const mockSetSelectedTaskIndex = jest.fn();
  const mockReorderTasks = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTasks.mockReturnValue({
      tasks: mockTasks,
      setSelectedTaskIndex: mockSetSelectedTaskIndex,
      reorderTasks: mockReorderTasks,
    } as any);
  });

  it("should provide DND context to children", async () => {
    let contextValue: any = null;

    const TestComponent = () => {
      try {
        contextValue = useDNDTasksContext();
        return <div data-testid="context-value">has-context</div>;
      } catch {
        return <div data-testid="context-value">no-context</div>;
      }
    };

    await act(() =>
      render(
        <DNDTasksProvider>
          <TestComponent />
        </DNDTasksProvider>,
      ),
    );

    expect(screen.getByTestId("context-value")).toHaveTextContent(
      "has-context",
    );
    expect(contextValue).toBeDefined();
    expect(typeof contextValue.onDragStart).toBe("function");
    expect(typeof contextValue.onDragEnd).toBe("function");
  });

  it("should call setSelectedTaskIndex and announce on drag start", () => {
    const mockAnnounce = jest.fn();

    // Create a test component that calls the context functions directly
    let capturedContext: any = null;

    const TestComponent = () => {
      capturedContext = useDNDTasksContext();

      React.useEffect(() => {
        if (capturedContext) {
          capturedContext.onDragStart(
            {
              draggableId: "task-1",
              type: "task",
              source: { droppableId: "task-list", index: 0 },
              mode: "FLUID",
            },
            { announce: mockAnnounce } as any,
          );
        }
      }, [capturedContext]);

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
    const mockAnnounce = jest.fn();

    let capturedContext: any = null;

    const TestComponent = () => {
      capturedContext = useDNDTasksContext();

      React.useEffect(() => {
        if (capturedContext) {
          capturedContext.onDragEnd(
            {
              draggableId: "task-1",
              type: "task",
              source: { droppableId: "task-list", index: 0 },
              destination: { droppableId: "task-list", index: 1 },
              reason: "DROP",
              combine: null,
              mode: "FLUID",
            },
            { announce: mockAnnounce } as any,
          );
        }
      }, [capturedContext]);

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
    const mockAnnounce = jest.fn();

    let capturedContext: any = null;

    const TestComponent = () => {
      capturedContext = useDNDTasksContext();

      React.useEffect(() => {
        if (capturedContext) {
          capturedContext.onDragUpdate(
            {
              draggableId: "task-1",
              type: "task",
              source: { droppableId: "task-list", index: 0 },
              destination: { droppableId: "task-list", index: 1 },
              combine: null,
              mode: "FLUID",
            },
            { announce: mockAnnounce } as any,
          );
        }
      }, [capturedContext]);

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
    const mockAnnounce = jest.fn();

    let capturedContext: any = null;

    const TestComponent = () => {
      capturedContext = useDNDTasksContext();

      React.useEffect(() => {
        if (capturedContext) {
          capturedContext.onDragEnd(
            {
              draggableId: "task-1",
              type: "task",
              source: { droppableId: "task-list", index: 0 },
              destination: null,
              reason: "CANCEL",
              combine: null,
              mode: "FLUID",
            },
            { announce: mockAnnounce } as any,
          );
        }
      }, [capturedContext]);

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
    let capturedContext: any = null;

    const TestComponent = () => {
      capturedContext = useDNDTasksContext();

      React.useEffect(() => {
        if (capturedContext) {
          capturedContext.onDragEnd(
            {
              draggableId: "task-1",
              type: "task",
              source: { droppableId: "task-list", index: 0 },
              destination: null,
              reason: "DROP",
              combine: null,
              mode: "FLUID",
            },
            { announce: jest.fn() } as any,
          );
        }
      }, [capturedContext]);

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
    let capturedContext: any = null;

    const TestComponent = () => {
      capturedContext = useDNDTasksContext();

      React.useEffect(() => {
        if (capturedContext) {
          capturedContext.onDragEnd(
            {
              draggableId: "task-1",
              type: "task",
              source: { droppableId: "task-list", index: 0 },
              destination: { droppableId: "task-list", index: 0 },
              reason: "DROP",
              combine: null,
              mode: "FLUID",
            },
            { announce: jest.fn() } as any,
          );
        }
      }, [capturedContext]);

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
