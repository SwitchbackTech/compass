/** @type { { mongodbMemoryServerOptions: import("mongodb-memory-server").MongoMemoryServer["opts"] } } */
module.exports = {
  mongodbMemoryServerOptions: {
    binary: {
      skipMD5: true,
    },
    instance: {},
    replSet: {
      count: 1,
      name: "compass-test",
      storageEngine: "wiredTiger",
    },
    autoStart: false,
  },
  useSharedDBForAllJestWorkers: false,
};
