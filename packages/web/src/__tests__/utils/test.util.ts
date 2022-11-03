interface Spies {
  [key: string]: jest.SpyInstance;
}
const spies: Spies = {};

export const arraysAreEqual = (a: any[], b: any[]) => {
  return (
    Array.isArray(a) &&
    Array.isArray(b) &&
    a.length === b.length &&
    a.every((val, index) => val === b[index])
  );
};

export const clearLocalStorageMock = () => {
  Object.keys(spies).forEach((key: string) => spies[key].mockRestore());
};

export const mockLocalStorage = () => {
  ["setItem", "getItem", "removeItem", "clear"].forEach((fn: string) => {
    const mock = jest.fn(localStorage[fn]);
    spies[fn] = jest.spyOn(Storage.prototype, fn).mockImplementation(mock);
  });
};

export const mockResizeObserver = () => {
  global.ResizeObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  }));
};

export const mockScroll = () => {
  window.HTMLElement.prototype.scroll = jest.fn();
};
