// sort-imports-ignore
// Bun preload for the backend test suite. Replaces the Jest project config
// (setupFiles + setupFilesAfterEnv + @shelf/jest-mongodb preset) with one
// ordered, single-process setup:
//   1. Install the jest -> bun:test compatibility layer (global `jest`).
//   2. Core env (NODE_ENV=test) so CONFIG resolves from env, not compass.yaml.
//   3. Start one in-memory Mongo replica set and publish its URI.
//   4. Backend env (reads the URI) + node-module mocks and per-test hooks.
// The server is torn down once, after every file in the process has run.
import "@scripts/testing/core.jest-compat";
import "@core/__tests__/core.test.init";
import {
  startMemoryMongo,
  stopMemoryMongo,
} from "@backend/__tests__/helpers/mongo-memory-server";
import { afterAll } from "bun:test";

const uri = await startMemoryMongo();
(globalThis as typeof globalThis & { __MONGO_URI__: string }).__MONGO_URI__ =
  uri;
process.env["MONGO_URI"] = uri;

await import("@backend/__tests__/backend.test.init");
await import("@backend/__tests__/backend.test.start");

afterAll(async () => {
  await stopMemoryMongo();
});
