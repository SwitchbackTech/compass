import {
  deriveSyncMongoUri,
  ensureSyncConfig,
  readSyncPort,
} from "@scripts/commands/ensure-sync-config";
import { describe, expect, it } from "bun:test";

const SAMPLE_YAML = `# Compass Config
# hand-written setup notes live here

runtime:
  nodeEnv: development
  timezone: Etc/UTC

web:
  port: 9080
  url: http://localhost:9080

backend:
  port: 3000
  apiUrl: http://localhost:3000/api
  originsAllowed:
    - http://localhost:3000
    - http://localhost:9080
    - https://staging.example.com
  compassToken: super-secret-token

mongo:
  # keep this uri pointed at the dev cluster
  uri: mongodb+srv://admin:s3cret@cluster0.example.mongodb.net/dev_calendar
`;

describe("readSyncPort", () => {
  it("reads a configured sync port", () => {
    expect(readSyncPort("sync:\n  port: 3011\n")).toBe(3011);
  });

  it("returns null when no sync.port is configured, not a default guess", () => {
    // A worktree with no sync: block yet must not read as claiming
    // SYNC_PORT_BASE to every other worktree's conflict check.
    expect(readSyncPort("web:\n  port: 9080\n")).toBeNull();
  });

  it("returns null for malformed yaml", () => {
    expect(readSyncPort("{{ not yaml")).toBeNull();
  });
});

describe("deriveSyncMongoUri", () => {
  it("swaps the database segment, keeping host and credentials", () => {
    expect(
      deriveSyncMongoUri(
        "mongodb+srv://admin:s3cret@cluster0.example.mongodb.net/dev_calendar?appName=Dev",
      ),
    ).toBe(
      "mongodb+srv://admin:s3cret@cluster0.example.mongodb.net/compass_sync?appName=Dev",
    );
  });

  it("works without +srv, a port, or a query string", () => {
    expect(
      deriveSyncMongoUri("mongodb://compass:pw@mongo:27017/compass_calendar"),
    ).toBe("mongodb://compass:pw@mongo:27017/compass_sync");
  });

  it("returns null for a uri with no database segment", () => {
    expect(
      deriveSyncMongoUri("mongodb+srv://admin:s3cret@cluster0.example"),
    ).toBeNull();
  });
});

describe("ensureSyncConfig", () => {
  it("derives a complete sync: block from mongo.uri, preserving the rest of the file", () => {
    const result = ensureSyncConfig(SAMPLE_YAML, 3010, "http://localhost:9080");

    expect(result).toContain("port: 3010");
    expect(result).toContain(
      "mongoUri: mongodb+srv://admin:s3cret@cluster0.example.mongodb.net/compass_sync",
    );
    expect(result).toContain("serviceUrl: http://localhost:3010");
    expect(result).toContain("callbackBaseUrl: http://localhost:3010");
    expect(result).toContain("postConnectRedirectUrl: http://localhost:9080");
    expect(result).toMatch(/internalAuthToken: [0-9a-f]{48}/);

    expect(result).toContain("compassToken: super-secret-token");
    expect(result).toContain(
      "mongodb+srv://admin:s3cret@cluster0.example.mongodb.net/dev_calendar",
    );
  });

  it("is a no-op once sync.mongoUri is already present", () => {
    const first = ensureSyncConfig(SAMPLE_YAML, 3010, "http://localhost:9080");
    expect(
      ensureSyncConfig(first as string, 3011, "http://localhost:9080"),
    ).toBeNull();
  });

  it("returns null when mongo.uri is absent (frontend-only worktree)", () => {
    const frontendOnly = SAMPLE_YAML.replace(
      /mongo:\n {2}# keep this uri pointed at the dev cluster\n {2}uri: .*\n/,
      "",
    );
    expect(
      ensureSyncConfig(frontendOnly, 3010, "http://localhost:9080"),
    ).toBeNull();
  });

  it("never overwrites an already-present internalAuthToken", () => {
    const withToken = SAMPLE_YAML.replace(
      "mongo:",
      "sync:\n  internalAuthToken: keep-me\nmongo:",
    );
    const result = ensureSyncConfig(withToken, 3010, "http://localhost:9080");
    expect(result).toContain("internalAuthToken: keep-me");
  });
});
