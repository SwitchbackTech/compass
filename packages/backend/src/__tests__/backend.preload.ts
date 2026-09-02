// sort-imports-ignore
import { applyBackendTestEnv } from "@scripts/testing/backend-test-env";

const sharedMongoUri = process.env["COMPASS_TEST_MONGO_URI"];
if (sharedMongoUri) {
  applyBackendTestEnv(sharedMongoUri);
}

// Bun preload for the backend test suite. Ordered, single-process setup:
//   1. Core env (NODE_ENV=test) so CONFIG resolves from env, not compass.yaml.
//   2. Start one in-memory Mongo replica set and publish its URI.
//   3. Backend env (reads the URI) + injectable test seams via backend.test.start.
import "@core/__tests__/core.test.init";
import {
  startMemoryMongo,
  stopMemoryMongo,
} from "@backend/__tests__/helpers/mongo-memory-server";
import mongoService from "@backend/common/services/mongo.service";
import { afterAll } from "bun:test";

const uri = await startMemoryMongo();
(globalThis as typeof globalThis & { __MONGO_URI__: string }).__MONGO_URI__ =
  uri;
process.env["MONGO_URI"] = uri;

await import("@backend/__tests__/backend.test.init");
await import("@backend/__tests__/backend.test.start");

afterAll(async () => {
  // Close this worker's own connection before anything else.
  //
  // Under `test-mongo-env.ts` every worker shares one mongod supplied through
  // COMPASS_TEST_MONGO_URI, which makes stopMemoryMongo() below a no-op - so
  // without this line the worker finishes its last test still holding an open
  // socket, and whether the process then exits is left to Bun's handle
  // teardown. When it loses that race the worker never exits, the runner's
  // `await proc.exited` blocks forever, and the CI step dies on its timeout
  // with every test having passed. That is exactly what happened to
  // `unit (scripts)` on #3101: all tests green at 17:15:51, silence until the
  // 5-minute timeout at 17:21:00, and cleanup reaping an orphaned mongod
  // alongside five live bun processes.
  //
  // mongoService.stop() is a no-op when the worker never connected, so this is
  // safe for the suites that hold no database at all.
  await mongoService.stop();
  await stopMemoryMongo();
});
