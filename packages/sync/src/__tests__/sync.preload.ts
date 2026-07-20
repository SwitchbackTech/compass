// sort-imports-ignore
// Test preload for @compass/sync. Applies the bun:test -> jest API shim so
// sync tests may use jest.fn/spyOn like the other packages, pins the test
// environment, and starts one in-memory Mongo replica set for the process.
// Storage tests isolate themselves with per-test database names.
import "@scripts/testing/core.jest-compat";
import {
  startMemoryMongo,
  stopMemoryMongo,
} from "@sync/__tests__/helpers/mongo-memory";
import { afterAll } from "bun:test";

process.env["NODE_ENV"] = "test";
process.env["LOG_LEVEL"] = "debug";

const uri = await startMemoryMongo();
process.env["SYNC_MONGO_URI"] = uri;

afterAll(async () => {
  await stopMemoryMongo();
});
