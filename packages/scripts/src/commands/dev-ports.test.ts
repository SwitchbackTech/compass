import {
  deriveSyncMongoUri,
  ensureSyncConfig,
  readPorts,
  readSyncPort,
  reassignPorts,
} from "@scripts/commands/dev-ports";
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

describe("readPorts", () => {
  it("reads configured ports", () => {
    expect(readPorts(SAMPLE_YAML)).toEqual({ web: 9080, backend: 3000 });
  });

  it("falls back to defaults when ports are missing", () => {
    expect(readPorts("web:\n  url: http://localhost:9080\n")).toEqual({
      web: 9080,
      backend: 3000,
    });
  });

  it("returns null for malformed yaml", () => {
    expect(readPorts("{{ not yaml")).toBeNull();
  });
});

describe("reassignPorts", () => {
  const next = { web: 9081, backend: 3001 };

  it("rewrites ports, urls, and localhost origins consistently", () => {
    const result = reassignPorts(SAMPLE_YAML, next);

    expect(result).toContain("port: 9081");
    expect(result).toContain("url: http://localhost:9081");
    expect(result).toContain("port: 3001");
    expect(result).toContain("apiUrl: http://localhost:3001/api");
    expect(result).toContain("- http://localhost:3001");
    expect(result).toContain("- http://localhost:9081");
    expect(result).not.toContain("9080");
    expect(result).not.toContain(": 3000");
  });

  it("preserves comments, secrets, and non-localhost origins", () => {
    const result = reassignPorts(SAMPLE_YAML, next);

    expect(result).toContain("# hand-written setup notes live here");
    expect(result).toContain("# keep this uri pointed at the dev cluster");
    expect(result).toContain("compassToken: super-secret-token");
    expect(result).toContain(
      "mongodb+srv://admin:s3cret@cluster0.example.mongodb.net/dev_calendar",
    );
    expect(result).toContain("- https://staging.example.com");
  });

  it("bails when apiUrl is customized (e.g. a tunnel)", () => {
    const customized = SAMPLE_YAML.replace(
      "apiUrl: http://localhost:3000/api",
      "apiUrl: https://example.trycloudflare.com/api",
    );
    expect(reassignPorts(customized, next)).toBeNull();
  });

  it("bails when web.url is customized", () => {
    const customized = SAMPLE_YAML.replace(
      "url: http://localhost:9080",
      "url: https://compass.example.com",
    );
    expect(reassignPorts(customized, next)).toBeNull();
  });
});

describe("readSyncPort", () => {
  it("reads a configured sync port", () => {
    expect(readSyncPort("sync:\n  port: 3011\n")).toBe(3011);
  });

  it("falls back to the base when unset", () => {
    expect(readSyncPort("web:\n  port: 9080\n")).toBe(3010);
  });

  it("falls back to the base for malformed yaml", () => {
    expect(readSyncPort("{{ not yaml")).toBe(3010);
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
  it("derives a complete sync: block from mongo.uri", () => {
    const result = ensureSyncConfig(SAMPLE_YAML, 3010, "http://localhost:9080");

    expect(result).toContain("port: 3010");
    expect(result).toContain(
      "mongoUri: mongodb+srv://admin:s3cret@cluster0.example.mongodb.net/compass_sync",
    );
    expect(result).toContain("serviceUrl: http://localhost:3010");
    expect(result).toContain("callbackBaseUrl: http://localhost:3010");
    expect(result).toContain("postConnectRedirectUrl: http://localhost:9080");
    expect(result).toMatch(/internalAuthToken: [0-9a-f]{48}/);
  });

  it("preserves everything else, including the source mongo.uri", () => {
    const result = ensureSyncConfig(SAMPLE_YAML, 3010, "http://localhost:9080");

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
