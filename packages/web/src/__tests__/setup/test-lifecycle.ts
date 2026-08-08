import { server } from "../__mocks__/server/mock.server";
import {
  installDefaultWebTestSeams,
  resetWebTestSeams,
} from "../helpers/web-test-seams";
import { ensureIndexedDbTestEnv } from "./indexeddb-env";
import { dom } from "./jsdom-env";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  expect,
  mock,
} from "bun:test";
import { createRequire } from "node:module";

const requireMatchers = createRequire(import.meta.path);
const jestDomMatchers = requireMatchers(
  "@testing-library/jest-dom/dist/matchers.js",
) as Record<string, unknown>;
expect.extend(jestDomMatchers);
(globalThis as typeof globalThis & { expect: typeof expect }).expect = expect;

const { cleanup, configure } = await import("@testing-library/react");
const { resetAllStores } = await import("../utils/state/reset-stores");
const { BaseApi } = await import("@web/api/base/base.api");
const { clearAppLockReasons } = await import("@web/shortcuts/app-lock");
const { clearFloatingLayerReasons } = await import(
  "@web/shortcuts/floating-layer"
);

configure({ asyncUtilTimeout: 5000 });

function resetDocument() {
  document.body.innerHTML = "";
  document.body.removeAttribute("style");
  document.body.removeAttribute("class");
  document.body.removeAttribute("data-app-locked");
  clearAppLockReasons();
  clearFloatingLayerReasons();
  document.documentElement.removeAttribute("style");
  for (const style of document.head.querySelectorAll("style")) {
    if (
      !style.textContent?.includes(":has(.react-datepicker__day--selected)")
    ) {
      continue;
    }

    style.textContent = style.textContent.replaceAll(
      /[^{}]+:has\(\.react-datepicker__day--selected\)[^{]*\{[^{}]*\}/g,
      "",
    );
  }
}

function resetBrowserState() {
  dom.reconfigure({ url: "http://localhost/" });
  localStorage.clear();
  sessionStorage.clear();
}

beforeEach(() => {
  installDefaultWebTestSeams();
});

beforeAll(async () => {
  await ensureIndexedDbTestEnv();
  server.listen({ onUnhandledRequest: "error" });
});
afterEach(async () => {
  await Promise.resolve();
  cleanup();
  resetDocument();
  resetBrowserState();
  resetAllStores();
  resetWebTestSeams();
  BaseApi.defaults.adapter = undefined;
  server.resetHandlers();
});
afterAll(() => {
  resetDocument();
  resetBrowserState();
  resetAllStores();
  resetWebTestSeams();
  server.close();
  mock.restore();
});
