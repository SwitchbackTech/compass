import { renderHook } from "@testing-library/react";
import { LocalTaskRepository } from "./local.task.repository";
import { useTaskRepository } from "./useTaskRepository";

describe("useTaskRepository", () => {
  it("returns an instance of LocalTaskRepository", () => {
    const { result } = renderHook(() => useTaskRepository());
    expect(result.current).toBeInstanceOf(LocalTaskRepository);
  });

  it("returns the same instance across rerenders", () => {
    const { result, rerender } = renderHook(() => useTaskRepository());
    const firstInstance = result.current;
    rerender();
    const secondInstance = result.current;
    expect(firstInstance).toBe(secondInstance);
  });
});
