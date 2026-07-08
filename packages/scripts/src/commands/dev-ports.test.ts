import {
  readPorts,
  reassignPorts,
  syncLaunchConfig,
} from "@scripts/commands/dev-ports";

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

describe("syncLaunchConfig", () => {
  const SAMPLE_LAUNCH = `{
  "version": "0.0.1",
  "configurations": [
    {
      "name": "Backend",
      "runtimeExecutable": "/opt/homebrew/bin/bun",
      "runtimeArgs": ["dev:backend"],
      "port": 3000
    },
    {
      "name": "Web",
      "runtimeExecutable": "/opt/homebrew/bin/bun",
      "runtimeArgs": ["run", "dev:web"],
      "port": 9080
    },
    {
      "name": "Debug Web",
      "runtimeExecutable": "/opt/homebrew/bin/bun",
      "runtimeArgs": ["run", "debug:web"],
      "port": 8080
    }
  ]
}
`;

  it("replaces only the port digits, leaving every other line untouched", () => {
    const result = syncLaunchConfig(SAMPLE_LAUNCH, {
      web: 9081,
      backend: 3001,
    });

    expect(result).toContain(
      '"runtimeArgs": ["dev:backend"],\n      "port": 3001',
    );
    expect(result).toContain(
      '"runtimeArgs": ["run", "dev:web"],\n      "port": 9081',
    );
    expect(result).toContain('"port": 8080'); // Debug Web untouched
    expect(JSON.parse(result as string)).toEqual(
      JSON.parse(
        SAMPLE_LAUNCH.replace('"port": 3000', '"port": 3001').replace(
          '"port": 9080',
          '"port": 9081',
        ),
      ),
    );
  });

  it("returns null when ports already match (no-op)", () => {
    expect(
      syncLaunchConfig(SAMPLE_LAUNCH, { web: 9080, backend: 3000 }),
    ).toBeNull();
  });
});
