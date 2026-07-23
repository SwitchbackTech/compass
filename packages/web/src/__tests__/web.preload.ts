// sort-imports-ignore — side-effect import order matters

import "@core/__tests__/core.test.init";
import "@core/__tests__/core.test.start";
import "./web.test.init";

import "./setup/asset-stubs.plugin";
import "./setup/jsdom-env";
import "./setup/browser-polyfills";
import "./setup/indexeddb-env";

import { mockNodeModules } from "./__mocks__/mock.setup";

mockNodeModules();

// Dynamic import keeps lifecycle hooks (and session import) after mock.module
// registration — static imports are hoisted and would run mockNodeModules too late.
await import("./setup/test-lifecycle");
