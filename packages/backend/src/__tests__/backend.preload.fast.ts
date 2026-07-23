// sort-imports-ignore
import { applyBackendTestEnv } from "@scripts/testing/backend-test-env";

const sharedMongoUri = process.env["COMPASS_TEST_MONGO_URI"];
if (sharedMongoUri) {
  applyBackendTestEnv(sharedMongoUri);
}

// Fast tier: env + injectable seams only. Non-db tests never connect to Mongo.
// Mirrors backend.preload.ts without startMemoryMongo() — test-parallel.ts sets
// COMPASS_TEST_MONGO_URI to a synthetic URI so parallel workers share the same
// env contract as test-mongo-env.ts.
import "@core/__tests__/core.test.init";

const unusedUri =
  sharedMongoUri ?? "mongodb://127.0.0.1:27017/unused-compass-test";
(globalThis as typeof globalThis & { __MONGO_URI__: string }).__MONGO_URI__ =
  unusedUri;
process.env["MONGO_URI"] = unusedUri;
if (!sharedMongoUri) {
  applyBackendTestEnv(unusedUri);
}

await import("@backend/__tests__/backend.test.init");
await import("@backend/__tests__/backend.test.start");
