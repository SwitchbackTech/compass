// sort-imports-ignore — side-effect import order matters

import { JSDOM } from "jsdom";
import { jest as jestBinding } from "./patched-jest.cjs";
import { afterAll, afterEach, beforeAll, beforeEach, expect } from "bun:test";
import { createRequire } from "node:module";

globalThis.jest = jestBinding;
import "@core/__tests__/core.test.init";
import "@core/__tests__/core.test.start";
import "./web.test.init";
import { mockNodeModules } from "./__mocks__/mock.setup";
import {
  appendTailwindCss,
  getTailwindCss,
} from "./__mocks__/mock.tailwindcss";
import { server } from "./__mocks__/server/mock.server";

const requireMatchers = createRequire(import.meta.path);
const jestDomMatchers = requireMatchers(
  "@testing-library/jest-dom/dist/matchers.js",
) as Record<string, unknown>;
expect.extend(jestDomMatchers);

Bun.plugin({
  name: "web-test-asset-stubs",
  setup(build) {
    build.onResolve({ filter: /\.(css|less)$/ }, () => ({
      path: "virtual:web-test-empty-style",
      namespace: "web-test-stub",
    }));

    build.onResolve({ filter: /\.(jpe?g|png|gif)$/i }, () => ({
      path: "virtual:web-test-file-stub",
      namespace: "web-test-stub",
    }));

    build.onResolve({ filter: /\.svg$/ }, () => ({
      path: "virtual:web-test-svg-stub",
      namespace: "web-test-stub",
    }));

    build.onLoad({ filter: /.*/, namespace: "web-test-stub" }, (args) => {
      if (args.path === "virtual:web-test-empty-style") {
        return { contents: "export default {};", loader: "js" };
      }

      if (args.path === "virtual:web-test-file-stub") {
        return { contents: 'export default "test-file-stub";', loader: "js" };
      }

      if (args.path === "virtual:web-test-svg-stub") {
        return {
          contents: `
import { createElement, forwardRef } from "react";
const SvgrMock = forwardRef((props, ref) => createElement("span", { ref, ...props }));
SvgrMock.displayName = "SvgrMock";
export const ReactComponent = SvgrMock;
export default SvgrMock;
`,
          loader: "tsx",
        };
      }
    });
  },
});

const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", {
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
globalThis.HTMLAnchorElement = window.HTMLAnchorElement;
globalThis.Node = window.Node;
globalThis.self = window;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const noopAlert = () => {};
window.alert = noopAlert;
globalThis.alert = noopAlert;

class MockObserver<T> implements IntersectionObserver, ResizeObserver {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(_callback: T, _options?: IntersectionObserverInit) {}

  root!: Document | Element | null;
  rootMargin!: string;
  thresholds!: readonly number[];
  observe = (...args: unknown[]): unknown => args;
  unobserve = (...args: unknown[]): unknown => args;
  disconnect = (...args: unknown[]): unknown => args;
  takeRecords = (): IntersectionObserverEntry[] => [];
}

class MediaQuery implements MediaQueryList {
  matches = false;
  media: string;
  onchange = null;

  constructor(query: string) {
    this.media = query;
  }

  addListener(): void {}

  removeListener(): void {}

  removeEventListener(): void {}

  addEventListener(): void {}

  dispatchEvent(): boolean {
    return true;
  }
}

function getPointerEvent(mouseEvent: typeof globalThis.MouseEvent) {
  class PointerEvent extends mouseEvent implements globalThis.PointerEvent {
    altitudeAngle: number;
    azimuthAngle: number;
    height: number;
    isPrimary: boolean;
    pointerId: number;
    pointerType: string;
    pressure: number;
    tangentialPressure: number;
    tiltX: number;
    tiltY: number;
    twist: number;
    width: number;

    constructor(type: string, eventInitDict?: PointerEventInit) {
      super(type, eventInitDict);
      this.altitudeAngle = eventInitDict?.altitudeAngle ?? 0;
      this.azimuthAngle = eventInitDict?.azimuthAngle ?? 0;
      this.height = eventInitDict?.height ?? 1;
      this.isPrimary = eventInitDict?.isPrimary ?? false;
      this.pointerId = eventInitDict?.pointerId ?? 0;
      this.pointerType = eventInitDict?.pointerType ?? "";
      this.pressure = eventInitDict?.pressure ?? 0;
      this.tangentialPressure = eventInitDict?.tangentialPressure ?? 0;
      this.tiltX = eventInitDict?.tiltX ?? 0;
      this.tiltY = eventInitDict?.tiltY ?? 0;
      this.twist = eventInitDict?.twist ?? 0;
      this.width = eventInitDict?.width ?? 1;
    }

    getCoalescedEvents(): globalThis.PointerEvent[] {
      throw new Error("Method not implemented.");
    }

    getPredictedEvents(): globalThis.PointerEvent[] {
      throw new Error("Method not implemented.");
    }
  }

  return PointerEvent;
}

const css = await getTailwindCss();
appendTailwindCss(window.document, css);

window.HTMLElement.prototype.scroll = () => {};
window.HTMLElement.prototype.scrollIntoView = () => {};
window.document.elementFromPoint = () => null;
window.PointerEvent = getPointerEvent(window.MouseEvent);

window.fetch = globalThis.fetch.bind(globalThis);
window.Blob = globalThis.Blob;
window.File = globalThis.File;
window.FormData = globalThis.FormData;
window.Headers = globalThis.Headers;
window.Request = globalThis.Request;
window.Response = globalThis.Response;
window.XMLHttpRequest = globalThis.XMLHttpRequest;
window.ArrayBuffer = globalThis.ArrayBuffer;
window.Uint8Array = globalThis.Uint8Array;
window.Uint8ClampedArray = globalThis.Uint8ClampedArray;
window.Uint16Array = globalThis.Uint16Array;
window.Uint32Array = globalThis.Uint32Array;
window.Int8Array = globalThis.Int8Array;
window.Int16Array = globalThis.Int16Array;
window.Int32Array = globalThis.Int32Array;
window.Float32Array = globalThis.Float32Array;
window.Float64Array = globalThis.Float64Array;
window.DataView = globalThis.DataView;
window.SharedArrayBuffer = globalThis.SharedArrayBuffer;
window.Atomics = globalThis.Atomics;
window.WebAssembly = globalThis.WebAssembly;

window.URL.createObjectURL = globalThis.URL.createObjectURL.bind(window.URL);
window.URL.revokeObjectURL = globalThis.URL.revokeObjectURL.bind(window.URL);

window.IntersectionObserver =
  MockObserver<IntersectionObserverCallback> as unknown as typeof IntersectionObserver;
window.ResizeObserver =
  MockObserver<ResizeObserverCallback> as unknown as typeof ResizeObserver;

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string): MediaQueryList => new MediaQuery(query),
});

const originalGetContext = window.HTMLCanvasElement.prototype.getContext;
window.HTMLCanvasElement.prototype.getContext = function (
  this: HTMLCanvasElement,
  contextId: string,
  ...args: unknown[]
) {
  if (contextId === "2d") {
    return {
      font: "",
      measureText: (text: string) => ({ width: text.length * 7 }),
    } as unknown as CanvasRenderingContext2D;
  }

  return originalGetContext.apply(this, [contextId, ...args] as never);
};

await import("fake-indexeddb/auto");

if (typeof globalThis.structuredClone === "undefined") {
  globalThis.structuredClone = (obj: unknown) => {
    return JSON.parse(JSON.stringify(obj));
  };
}

mockNodeModules();

beforeEach(() => {
  jestBinding.clearAllMocks();
  const sessionModule = jestBinding.requireMock(
    "supertokens-web-js/recipe/session",
  ) as {
    doesSessionExist?: { mockResolvedValue: (v: boolean) => void };
  };
  sessionModule.doesSessionExist?.mockResolvedValue(true);
});

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
afterAll(() => jestBinding.restoreAllMocks());
