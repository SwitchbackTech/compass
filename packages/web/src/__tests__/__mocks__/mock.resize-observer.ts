export const mockResizeObserver = () => {
  class ResizeObserverMock {
    callback: (...args: unknown[]) => void;

    constructor(callback: (...args: unknown[]) => void) {
      this.callback = callback;
    }

    observe = jest.fn();
    unobserve = jest.fn();
    disconnect = jest.fn();
  }

  Object.defineProperty(globalThis, "ResizeObserver", {
    configurable: true,
    writable: true,
    value: ResizeObserverMock,
  });
};
