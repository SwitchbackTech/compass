import { createContext } from "react";
import { renderHook } from "@testing-library/react";
import { useMetaContext } from "./useMetaContext";

describe("useMetaContext", () => {
  interface TestContextType {
    value: string;
  }

  const TestContext = createContext<TestContextType | null>(null);
  TestContext.displayName = "TestContext";

  it("should return context value when used within provider", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <TestContext.Provider value={{ value: "test" }}>
        {children}
      </TestContext.Provider>
    );

    const { result } = renderHook(
      () => useMetaContext(TestContext, "useTestContext"),
      { wrapper },
    );

    expect(result.current).toEqual({ value: "test" });
  });

  it("should throw error when used outside provider by default", () => {
    // Suppress console.error for this test as React logs the error
    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    expect(() => {
      renderHook(() => useMetaContext(TestContext, "useTestContext"));
    }).toThrow(
      "useTestContext must be used within TestContext and be defined.",
    );

    consoleSpy.mockRestore();
  });

  it("should throw error with default hook name if not provided", () => {
    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    expect(() => {
      renderHook(() => useMetaContext(TestContext));
    }).toThrow("hook must be used within TestContext and be defined.");

    consoleSpy.mockRestore();
  });

  it("should use default Provider name if displayName is not set", () => {
    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const AnonymousContext = createContext<TestContextType | null>(null);

    expect(() => {
      renderHook(() => useMetaContext(AnonymousContext, "useAnon"));
    }).toThrow("useAnon must be used within Provider and be defined.");

    consoleSpy.mockRestore();
  });

  it("should not throw error when throwIfOutsideContext is false", () => {
    const { result } = renderHook(() =>
      useMetaContext(TestContext, "useTestContext", false),
    );

    expect(result.current).toBeNull();
  });
});
