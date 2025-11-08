interface Spies {
  [key: string]: jest.SpyInstance;
}
const spies: Spies = {};

export const clearLocalStorageMock = () => {
  Object.keys(spies).forEach((key: string) => spies[key].mockRestore());
};
