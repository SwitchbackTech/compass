/**
 * Test to verify MongoDB binary setup for GitHub Copilot
 * This test checks if mongodb-memory-server can use pre-downloaded binaries
 */

const { MongoMemoryServer } = require("mongodb-memory-server");

describe("MongoDB Setup for Copilot", () => {
  it("should be able to start MongoDB with pre-downloaded binaries", async () => {
    // Set environment variables that would be set by the actions-setup-steps
    const originalEnv = { ...process.env };

    // These would be set by the GitHub Copilot setup steps
    process.env.MONGOMS_DOWNLOAD_DIR = "~/.cache/mongodb-binaries";
    process.env.MONGOMS_DISABLE_DOWNLOAD = "true";

    let mongod;

    try {
      // This should use the pre-downloaded binary instead of trying to download
      mongod = await MongoMemoryServer.create({
        binary: {
          skipMD5: true,
          downloadDir: process.env.MONGOMS_DOWNLOAD_DIR,
        },
        instance: {
          port: 0, // Use random available port
        },
      });

      const uri = mongod.getUri();
      console.log("✅ MongoDB started successfully at:", uri);

      expect(mongod).toBeDefined();
      expect(uri).toMatch(/^mongodb:\/\//);
    } catch (error) {
      console.error("❌ Failed to start MongoDB:", error.message);
      throw error;
    } finally {
      // Clean up
      if (mongod) {
        await mongod.stop();
      }
      // Restore original environment
      process.env = originalEnv;
    }
  }, 30000); // 30 second timeout for MongoDB startup
});
