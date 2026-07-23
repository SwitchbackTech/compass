import { JSDOM } from "jsdom";

export const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", {
  pretendToBeVisual: true,
  url: "http://localhost/",
});

const { window } = dom;

globalThis.window = window as unknown as Window & typeof globalThis;
globalThis.document = window.document;
globalThis.navigator = window.navigator;
globalThis.location = window.location;
globalThis.history = window.history;
globalThis.localStorage = window.localStorage;
globalThis.sessionStorage = window.sessionStorage;
globalThis.HTMLElement = window.HTMLElement;
Object.defineProperty(window, "HTMLIFrameElement", {
  configurable: true,
  value: window.HTMLElement,
  writable: true,
});
globalThis.HTMLIFrameElement = window.HTMLIFrameElement;
globalThis.HTMLAnchorElement = window.HTMLAnchorElement;
globalThis.Node = window.Node;
globalThis.Event = window.Event;
globalThis.CustomEvent = window.CustomEvent;
globalThis.MouseEvent = window.MouseEvent;
globalThis.KeyboardEvent = window.KeyboardEvent;
// Bun's native globalThis.dispatchEvent/addEventListener operate on Bun's own
// Event realm. Dexie constructs `new CustomEvent(...)` against the jsdom
// Event class above, so dispatching through Bun's native EventTarget throws
// "must be an instance of Event" (cross-realm brand check). Rebind these to
// jsdom's window so the whole event pipeline stays in one realm.
globalThis.dispatchEvent = window.dispatchEvent.bind(window);
globalThis.addEventListener = window.addEventListener.bind(window);
globalThis.removeEventListener = window.removeEventListener.bind(window);
globalThis.self = window;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const noopAlert = () => {};
window.alert = noopAlert;
globalThis.alert = noopAlert;
