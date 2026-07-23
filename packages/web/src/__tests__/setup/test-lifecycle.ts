import { server } from "../__mocks__/server/mock.server";
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

const sessionModule = await import("supertokens-web-js/recipe/session");
const { cleanup, configure } = await import("@testing-library/react");
const { resetAllStores } = await import("../utils/state/reset-stores");

// Give async queries (findBy*, waitFor) real headroom. The default 1000ms is
// fine locally (the whole suite runs in ~16s) but too tight on CI, where every
// matrix job shares the runner's cores: under that contention a component that
// resolves in tens of ms locally can take past a second, timing out queries in
// tests that are otherwise correct (AuthModal/SelectView flaked this way). A
// genuinely stuck async never resolves regardless, so this only widens the
// window for slow-but-correct ones — it cannot mask a real hang.
configure({ asyncUtilTimeout: 5000 });

function resetDocument() {
  document.body.innerHTML = "";
  document.body.removeAttribute("style");
  document.body.removeAttribute("class");
  document.body.removeAttribute("data-app-locked");
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
  sessionModule.doesSessionExist?.mockResolvedValue(true);
});

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(async () => {
  await Promise.resolve();
  cleanup();
  resetDocument();
  resetBrowserState();
  resetAllStores();
  server.resetHandlers();
});
// Safety net when multiple files share a --parallel worker: the last test in a
// file runs afterEach above; this mirrors that reset if Bun ever skips it.
afterAll(() => {
  resetDocument();
  resetBrowserState();
  resetAllStores();
});
afterAll(() => server.close());
afterAll(() => mock.restore());
