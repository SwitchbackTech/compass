import { MongoMemoryReplSet } from "mongodb-memory-server";
import { afterAll } from "bun:test";

const mongo = await MongoMemoryReplSet.create({
  binary: { checkMD5: false },
  replSet: { count: 1, name: "compass-test", storageEngine: "wiredTiger" },
});

process.env["NODE_ENV"] = "test";

await import("@backend/__tests__/backend.test.init");
process.env["MONGO_URI"] = mongo.getUri();

const { default: mongoService } = await import(
  "@backend/common/services/mongo.service"
);

await mongoService.start();

afterAll(async () => {
  await mongoService.stop();
  await mongo.stop();
});
