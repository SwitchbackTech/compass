/** @type { { mongodbMemoryServerOptions: import("mongodb-memory-server").MongoMemoryServer["opts"] } } */
module.exports = {
  mongodbMemoryServerOptions: {
    binary: {
      skipMD5: true,
      // Allow using pre-downloaded binaries to avoid firewall issues
      downloadDir: process.env.MONGOMS_DOWNLOAD_DIR || undefined,
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
