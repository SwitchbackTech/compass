class MockStorage implements Storage {
  private readonly items = new Map<string, string>();

  get length() {
    return this.items.size;
  }

  clear(): void {
    this.items.clear();
  }

  getItem(key: string): string | null {
    return this.items.get(key) ?? null;
  }

  key(index: number): string | null {
    return Array.from(this.items.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.items.delete(key);
  }

  setItem(key: string, value: string): void {
    this.items.set(key, value);
  }
}

export function mockLocalStorage(): void {
  const storage = new MockStorage();

  Object.defineProperty(globalThis, "Storage", {
    configurable: true,
    value: MockStorage,
  });

  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: storage,
  });

  if (typeof window !== "undefined") {
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: storage,
    });
  }
}
