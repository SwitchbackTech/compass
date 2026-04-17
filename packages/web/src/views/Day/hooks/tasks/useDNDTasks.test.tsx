import { render } from "@testing-library/react";
import { spyOn } from "bun:test";
import { useDNDTasksContext } from "./useDNDTasks";

describe("useDNDTasksContext", () => {
  it("should throw an error when used outside of DNDTasksProvider", () => {
    const TestComponent = () => {
      useDNDTasksContext();
      return <div>Test</div>;
    };

    // Mock console.error to avoid noise in test output
    const consoleSpy = spyOn(console, "error").mockImplementation(() => {});

    expect(() => render(<TestComponent />)).toThrow(
      "useDNDTasksContext must be used within DNDTasksProvider",
    );

    consoleSpy.mockRestore();
  });
});
