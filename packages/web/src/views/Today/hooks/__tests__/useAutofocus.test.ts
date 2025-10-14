import { useRef } from "react";
import { renderHook } from "@testing-library/react";
import { useAutofocus } from "../useAutofocus";

describe("useAutofocus", () => {
  let mockInput: HTMLInputElement;

  beforeEach(() => {
    mockInput = document.createElement("input");
    mockInput.focus = jest.fn();
    mockInput.select = jest.fn();
    mockInput.value = "test value";
    document.body.appendChild(mockInput);
  });

  afterEach(() => {
    document.body.removeChild(mockInput);
    jest.clearAllMocks();
  });

  it("should focus input when shouldFocus is true", () => {
    const { result } = renderHook(() => useRef(mockInput));
    const inputRef = result.current;

    renderHook(() =>
      useAutofocus({
        shouldFocus: true,
        inputRef: inputRef as any,
      }),
    );

    expect(mockInput.focus).toHaveBeenCalled();
  });

  it("should not focus input when shouldFocus is false", () => {
    const { result } = renderHook(() => useRef(mockInput));
    const inputRef = result.current;

    renderHook(() =>
      useAutofocus({
        shouldFocus: false,
        inputRef: inputRef as any,
      }),
    );

    expect(mockInput.focus).not.toHaveBeenCalled();
  });

  it("should select text when selectText is true", () => {
    const { result } = renderHook(() => useRef(mockInput));
    const inputRef = result.current;

    renderHook(() =>
      useAutofocus({
        shouldFocus: true,
        inputRef: inputRef as any,
        selectText: true,
      }),
    );

    expect(mockInput.select).toHaveBeenCalled();
  });

  it("should not select text when selectText is false", () => {
    const { result } = renderHook(() => useRef(mockInput));
    const inputRef = result.current;

    renderHook(() =>
      useAutofocus({
        shouldFocus: true,
        inputRef: inputRef as any,
        selectText: false,
      }),
    );

    expect(mockInput.select).not.toHaveBeenCalled();
  });

  it("should focus with preventScroll option", () => {
    const { result } = renderHook(() => useRef(mockInput));
    const inputRef = result.current;

    renderHook(() =>
      useAutofocus({
        shouldFocus: true,
        inputRef: inputRef as any,
        preventScroll: true,
      }),
    );

    expect(mockInput.focus).toHaveBeenCalledWith({ preventScroll: true });
  });

  it("should delay focus when delay is specified", (done) => {
    const { result } = renderHook(() => useRef(mockInput));
    const inputRef = result.current;

    renderHook(() =>
      useAutofocus({
        shouldFocus: true,
        inputRef: inputRef as any,
        delay: 100,
      }),
    );

    expect(mockInput.focus).not.toHaveBeenCalled();

    setTimeout(() => {
      expect(mockInput.focus).toHaveBeenCalled();
      done();
    }, 150);
  });

  it("should handle null inputRef gracefully", () => {
    const { result } = renderHook(() => useRef<HTMLInputElement>(null));
    const inputRef = result.current;

    expect(() => {
      renderHook(() =>
        useAutofocus({
          shouldFocus: true,
          inputRef,
        }),
      );
    }).not.toThrow();
  });

  it("should cleanup timeout on unmount when delay is set", () => {
    jest.useFakeTimers();
    const { result } = renderHook(() => useRef(mockInput));
    const inputRef = result.current;

    const { unmount } = renderHook(() =>
      useAutofocus({
        shouldFocus: true,
        inputRef: inputRef as any,
        delay: 1000,
      }),
    );

    unmount();
    jest.advanceTimersByTime(1000);

    // Focus should not be called after unmount
    expect(mockInput.focus).not.toHaveBeenCalled();

    jest.useRealTimers();
  });

  it("should re-run when dependencies change", () => {
    const { result } = renderHook(() => useRef(mockInput));
    const inputRef = result.current;

    const { rerender } = renderHook(
      ({ deps }) =>
        useAutofocus({
          shouldFocus: true,
          inputRef: inputRef as any,
          dependencies: deps,
        }),
      { initialProps: { deps: [1] } },
    );

    expect(mockInput.focus).toHaveBeenCalledTimes(1);

    rerender({ deps: [2] });

    expect(mockInput.focus).toHaveBeenCalledTimes(2);
  });
});
