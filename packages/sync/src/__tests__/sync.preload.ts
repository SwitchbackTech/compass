// sort-imports-ignore
// Test preload for @compass/sync. Pins the test environment and starts one
// in-memory Mongo replica set for the process. Storage tests isolate
// themselves with per-test database names.
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
