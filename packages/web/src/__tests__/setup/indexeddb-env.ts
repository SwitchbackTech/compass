import { dom } from "./jsdom-env";

await import("fake-indexeddb/auto");

const { window } = dom;

// fake-indexeddb/auto attaches indexedDB (and friends) to `typeof window
// !== "undefined" ? window : ...`, which resolves to the jsdom window set
// above. Dexie reads `globalThis.indexedDB`/`globalThis.IDBKeyRange`
// directly, so mirror them onto globalThis or `new Dexie(...).open()`
// throws MissingAPIError.
globalThis.indexedDB = window.indexedDB;
globalThis.IDBKeyRange = window.IDBKeyRange;
globalThis.IDBCursor = window.IDBCursor;
globalThis.IDBCursorWithValue = window.IDBCursorWithValue;
globalThis.IDBDatabase = window.IDBDatabase;
globalThis.IDBFactory = window.IDBFactory;
globalThis.IDBIndex = window.IDBIndex;
globalThis.IDBObjectStore = window.IDBObjectStore;
globalThis.IDBOpenDBRequest = window.IDBOpenDBRequest;
globalThis.IDBRequest = window.IDBRequest;
globalThis.IDBTransaction = window.IDBTransaction;
globalThis.IDBVersionChangeEvent = window.IDBVersionChangeEvent;
