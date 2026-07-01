export interface BrowserKeyValueStore {
  isAvailable(): boolean;
  get(key: string): string | null;
  set(key: string, value: string): boolean;
  remove(key: string): boolean;
  keys(): string[];
}

class NativeBrowserKeyValueStore implements BrowserKeyValueStore {
  constructor(private readonly getStorage: () => Storage) {}

  isAvailable(): boolean {
    try {
      void this.getStorage().length;
      return true;
    } catch {
      return false;
    }
  }

  get(key: string): string | null {
    try {
      return this.getStorage().getItem(key);
    } catch {
      return null;
    }
  }

  set(key: string, value: string): boolean {
    try {
      this.getStorage().setItem(key, value);
      return true;
    } catch {
      return false;
    }
  }

  remove(key: string): boolean {
    try {
      this.getStorage().removeItem(key);
      return true;
    } catch {
      return false;
    }
  }

  keys(): string[] {
    try {
      const storage = this.getStorage();
      return Array.from({ length: storage.length }, (_, index) =>
        storage.key(index),
      ).filter((key): key is string => key !== null);
    } catch {
      return [];
    }
  }
}

export const createBrowserKeyValueStore = (
  getStorage: () => Storage,
): BrowserKeyValueStore => new NativeBrowserKeyValueStore(getStorage);

export const persistentBrowserStore = createBrowserKeyValueStore(
  () => localStorage,
);

export const sessionBrowserStore = createBrowserKeyValueStore(
  () => sessionStorage,
);
