import { Schema_Event } from "@core/types/event.types";
interface Spies {
  [key: string]: jest.SpyInstance;
}
const spies: Spies = {};

export const clearLocalStorageMock = () => {
  Object.keys(spies).forEach((key: string) => spies[key].mockRestore());
};

export const mockLocalStorage = () => {
  ["setItem", "getItem", "clear"].forEach((fn: string) => {
    const mock = jest.fn(localStorage[fn]);
    spies[fn] = jest.spyOn(Storage.prototype, fn).mockImplementation(mock);
  });
};
