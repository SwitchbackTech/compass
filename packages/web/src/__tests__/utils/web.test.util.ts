export const arraysAreEqual = (a: unknown[], b: unknown[]) => {
  return (
    Array.isArray(a) &&
    Array.isArray(b) &&
    a.length === b.length &&
    a.every((val, index) => val === b[index])
  );
};

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

export const mockScroll = () => {
  window.HTMLElement.prototype.scroll = jest.fn();
  window.HTMLElement.prototype.scrollIntoView = jest.fn();
};
