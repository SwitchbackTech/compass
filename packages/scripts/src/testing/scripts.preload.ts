// sort-imports-ignore
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { applyBackendTestEnv } from "@backend/__tests__/helpers/test.env";
import "./core.jest-compat";
import "@core/__tests__/core.test.init";
import "@core/__tests__/core.test.start";

type TestGlobals = typeof globalThis & {
  __MONGO_REPL_SET__?: MongoMemoryReplSet;
  __MONGO_URI__?: string;
  __MONGO_PRELOAD_CLEANUP_REGISTERED__?: boolean;
};

const testGlobals = globalThis as TestGlobals;

async function stopMongoReplSet(): Promise<void> {
  const replSet = testGlobals.__MONGO_REPL_SET__;

  if (!replSet) {
    return;
  }

  testGlobals.__MONGO_REPL_SET__ = undefined;
  testGlobals.__MONGO_URI__ = undefined;

  await replSet.stop();
}

async function getMongoUri(): Promise<string> {
  if (!testGlobals.__MONGO_REPL_SET__) {
    testGlobals.__MONGO_REPL_SET__ = await MongoMemoryReplSet.create({
      binary: {
        skipMD5: true,
      },
      replSet: {
        count: 1,
        name: "compass-test",
        storageEngine: "wiredTiger",
      },
    });
  }

  const mongoUri = testGlobals.__MONGO_REPL_SET__.getUri();

  testGlobals.__MONGO_URI__ = mongoUri;

  return mongoUri;
}

const mongoUri = await getMongoUri();

applyBackendTestEnv(mongoUri);

if (!testGlobals.__MONGO_PRELOAD_CLEANUP_REGISTERED__) {
  testGlobals.__MONGO_PRELOAD_CLEANUP_REGISTERED__ = true;

  process.once("beforeExit", () => {
    void stopMongoReplSet();
  });
}
