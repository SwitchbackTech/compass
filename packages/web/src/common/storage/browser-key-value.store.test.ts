import {
  createBrowserKeyValueStore,
  persistentBrowserStore,
  sessionBrowserStore,
} from "./browser-key-value.store";
import { beforeEach, describe, expect, it } from "bun:test";

describe("BrowserKeyValueStore", () => {
  it("reads, writes, removes, and enumerates values", () => {
    const storage = createStorage();
    const store = createBrowserKeyValueStore(() => storage);

    expect(store.isAvailable()).toBe(true);
    expect(store.set("one", "1")).toBe(true);
    expect(store.set("two", "2")).toBe(true);
    expect(store.get("one")).toBe("1");
    expect(store.keys()).toEqual(["one", "two"]);
    expect(store.remove("one")).toBe(true);
    expect(store.get("one")).toBeNull();
  });

  it("handles unavailable storage without throwing", () => {
    const store = createBrowserKeyValueStore(() => {
      throw new Error("Storage unavailable");
    });

    expect(store.isAvailable()).toBe(false);
    expect(store.get("key")).toBeNull();
    expect(store.set("key", "value")).toBe(false);
    expect(store.remove("key")).toBe(false);
    expect(store.keys()).toEqual([]);
  });

  it("reports quota and security failures", () => {
    const storage = createStorage();
    storage.setItem = () => {
      throw new DOMException("Quota exceeded", "QuotaExceededError");
    };
    storage.removeItem = () => {
      throw new DOMException("Blocked", "SecurityError");
    };

    const store = createBrowserKeyValueStore(() => storage);

    expect(store.set("key", "value")).toBe(false);
    expect(store.remove("key")).toBe(false);
  });
});

describe("configured browser stores", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it("keeps persistent and session values separate", () => {
    expect(persistentBrowserStore.set("key", "persistent")).toBe(true);
    expect(sessionBrowserStore.set("key", "session")).toBe(true);

    expect(persistentBrowserStore.get("key")).toBe("persistent");
    expect(sessionBrowserStore.get("key")).toBe("session");
  });
});

function createStorage(): Storage {
  const values = new Map<string, string>();

  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => Array.from(values.keys())[index] ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, value),
  };
}
