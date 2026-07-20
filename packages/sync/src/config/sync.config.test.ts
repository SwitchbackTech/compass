import { type CompassConfig } from "@core/config/compass.config";
import {
  parseSyncConfig,
  parseSyncConfigFromEnv,
  SyncConfigSchema,
} from "@sync/config/sync.config";

const baseSyncSection = () => ({
  mongoUri: "mongodb+srv://compass_sync:pw@cluster/compass_sync",
  internalAuthToken: "internal-token",
  callbackBaseUrl: "https://staging.compasscalendar.com",
});

const compassConfigWithSync = (
  syncOverrides: Record<string, unknown> = {},
): CompassConfig =>
  ({
    runtime: { nodeEnv: "staging", timezone: "Etc/UTC" },
    sync: { ...baseSyncSection(), ...syncOverrides },
  }) as unknown as CompassConfig;

const baseEnv = () => ({
  NODE_ENV: "test",
  SYNC_MONGO_URI: "mongodb://localhost:27017/compass_sync",
  SYNC_INTERNAL_AUTH_TOKEN: "internal-token",
  SYNC_CALLBACK_BASE_URL: "http://localhost:3010",
});

describe("Sync service configuration", () => {
  describe("SyncConfigSchema defaults", () => {
    it("defaults execution to passive when omitted (safety default)", () => {
      const config = parseSyncConfig(compassConfigWithSync());
      expect(config.EXECUTION).toBe("passive");
    });

    it("defaults the port and concurrency when omitted", () => {
      const config = parseSyncConfig(compassConfigWithSync());
      expect(config.PORT).toBe(3010);
      expect(config.MAX_CONCURRENCY).toBe(4);
    });

    it("accepts an explicit active execution mode", () => {
      const config = parseSyncConfig(
        compassConfigWithSync({ execution: "active" }),
      );
      expect(config.EXECUTION).toBe("active");
    });

    it("coerces a yaml numeric string port to a number", () => {
      const config = parseSyncConfig(compassConfigWithSync({ port: "4010" }));
      expect(config.PORT).toBe(4010);
    });
  });

  describe("required fields", () => {
    it("throws a clear error when the sync section is absent", () => {
      const config = { runtime: { nodeEnv: "staging", timezone: "Etc/UTC" } };
      expect(() => parseSyncConfig(config as unknown as CompassConfig)).toThrow(
        /sync.*section/i,
      );
    });

    it.each([
      "mongoUri",
      "internalAuthToken",
      "callbackBaseUrl",
    ])("rejects a config missing %s", (field) => {
      const section = baseSyncSection() as Record<string, unknown>;
      delete section[field];
      const config = {
        runtime: { nodeEnv: "staging", timezone: "Etc/UTC" },
        sync: section,
      };
      expect(() =>
        parseSyncConfig(config as unknown as CompassConfig),
      ).toThrow();
    });

    it("rejects an empty mongoUri", () => {
      expect(() =>
        parseSyncConfig(compassConfigWithSync({ mongoUri: "   " })),
      ).toThrow();
    });
  });

  describe("invalid values", () => {
    it("rejects a non-URL callbackBaseUrl", () => {
      expect(() =>
        parseSyncConfig(
          compassConfigWithSync({ callbackBaseUrl: "not-a-url" }),
        ),
      ).toThrow();
    });

    it("rejects an unknown execution mode", () => {
      expect(() =>
        parseSyncConfig(compassConfigWithSync({ execution: "paused" })),
      ).toThrow();
    });

    it("rejects a non-positive port", () => {
      expect(() =>
        parseSyncConfig(compassConfigWithSync({ port: 0 })),
      ).toThrow();
    });

    it("rejects a fractional concurrency", () => {
      expect(() =>
        parseSyncConfig(compassConfigWithSync({ maxConcurrency: 2.5 })),
      ).toThrow();
    });
  });

  describe("unknown fields", () => {
    it("rejects an unknown top-level config field", () => {
      const result = SyncConfigSchema.safeParse({
        NODE_ENV: "test",
        MONGO_URI: "mongodb://localhost/compass_sync",
        INTERNAL_AUTH_TOKEN: "t",
        CALLBACK_BASE_URL: "http://localhost:3010",
        SUPERTOKENS_KEY: "leak",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("parseSyncConfigFromEnv", () => {
    it("parses a valid environment with the passive default", () => {
      const config = parseSyncConfigFromEnv(baseEnv());
      expect(config.EXECUTION).toBe("passive");
      expect(config.MONGO_URI).toBe("mongodb://localhost:27017/compass_sync");
    });

    it("reads an explicit execution mode from the environment", () => {
      const config = parseSyncConfigFromEnv({
        ...baseEnv(),
        SYNC_EXECUTION: "active",
      });
      expect(config.EXECUTION).toBe("active");
    });

    it("rejects an environment missing the internal auth token", () => {
      const env = baseEnv() as Record<string, string | undefined>;
      env["SYNC_INTERNAL_AUTH_TOKEN"] = undefined;
      expect(() => parseSyncConfigFromEnv(env)).toThrow();
    });
  });
});
