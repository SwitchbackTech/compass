import { afterEach, describe, expect, it } from "bun:test";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const repoRoot = join(import.meta.dir, "..");

function readRepoFile(path: string): string {
  return readFileSync(join(repoRoot, path), { encoding: "utf8" });
}

async function runHealthScript(
  args: string[],
  env: Record<string, string> = {},
) {
  const reportDir = makeTempDir();
  const proc = Bun.spawn(
    ["bash", join(repoRoot, ".github/scripts/deploy-health-check.sh"), ...args],
    {
      cwd: repoRoot,
      env: {
        ...process.env,
        HEALTH_CHECK_REPORT_FILE: join(reportDir, "report.txt"),
        ...env,
      },
      stderr: "pipe",
      stdout: "pipe",
    },
  );

  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);

  return { exitCode, stderr, stdout };
}

async function runHealthScriptFunction(
  command: string,
  env: Record<string, string> = {},
) {
  const proc = Bun.spawn(
    ["bash", "-c", `. .github/scripts/deploy-health-check.sh; ${command}`],
    {
      cwd: repoRoot,
      env: {
        ...process.env,
        ...env,
      },
      stderr: "pipe",
      stdout: "pipe",
    },
  );

  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);

  return { exitCode, stderr, stdout };
}

function makeTempDir() {
  const dir = mkdtempSync(join(tmpdir(), "compass-health-check-"));
  tempDirs.push(dir);
  return dir;
}

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { force: true, recursive: true });
  }
});

describe("self-host docker compose", () => {
  it("builds the backend image without build-time Compass config", () => {
    const dockerfile = readRepoFile("self-host/Dockerfile.backend");

    expect(dockerfile).toContain("RUN bun run build:backend");
    expect(dockerfile).not.toContain("--environment");
  });

  it("keeps PostHog out of the self-host web image", () => {
    const dockerfile = readRepoFile("self-host/Dockerfile.web");

    expect(dockerfile).not.toContain("COMPASS_WEB_BUILD_CONFIG_B64");
    expect(dockerfile).not.toContain("POSTHOG_");
    expect(dockerfile).not.toContain("posthog:");
  });

  it("mounts compass.yaml into the backend container", () => {
    const compose = readFileSync(join(import.meta.dir, "compose.yaml"), {
      encoding: "utf8",
    });

    expect(compose).toContain("COMPASS_CONFIG_FILE: /app/compass.yaml");
    expect(compose).toContain(
      "- $".concat(
        "{COMPASS_CONFIG_FILE:-./compass.yaml}:/app/compass.yaml:ro",
      ),
    );
  });
});

describe("self-host installer", () => {
  it("writes runnable local URLs in the generated compass config", () => {
    const installer = readRepoFile("self-host/install.sh");

    expect(installer).toContain("url: http://localhost:$WEB_PORT_VALUE");
    expect(installer).toContain("apiUrl: http://localhost:$PORT_VALUE/api");
    expect(installer).not.toContain("url: REPLACE_WITH_YOUR_WEB_URL");
    expect(installer).not.toContain("apiUrl: REPLACE_WITH_YOUR_API_URL");
    expect(installer).not.toContain("- REPLACE_WITH_YOUR_WEB_URL");
  });

  it("stops before generating new secrets when existing Docker volumes have no config", () => {
    const installer = readRepoFile("self-host/install.sh");

    expect(installer).toContain("check_missing_config_with_existing_volumes");
    expect(installer).toContain("docker volume inspect");
    expect(installer).toContain(
      "I found existing Compass Docker data, but $CONFIG_FILE is missing.",
    );
  });
});

describe("self-host helper", () => {
  it("defaults Docker Compose to the self-host profile", () => {
    const helper = readRepoFile("self-host/compass");

    expect(helper).toContain(
      'COMPOSE_PROFILES="' + "$" + '{COMPOSE_PROFILES-selfhosted}"',
    );
  });

  it("reads the Docker image version from runtime.version", () => {
    const helper = readRepoFile("self-host/compass");

    expect(helper).toContain("read_config_value runtime.version");
    expect(helper).not.toContain("read_config_value compose.version");
  });
});

describe("staging deploy workflow", () => {
  it("lets the self-host helper default compose profiles when the environment variable is unset", () => {
    const workflow = readRepoFile(".github/workflows/_deploy-environment.yml");

    expect(workflow).toContain('if [ -n "$COMPOSE_PROFILES" ]; then');
    expect(workflow).toContain("cd ~/compass && ./compass update");
  });

  it("falls back to the release tag when a configured compose ref is unavailable", () => {
    const workflow = readRepoFile(".github/workflows/_deploy-environment.yml");

    expect(workflow).toContain(
      'COMPOSE_GIT_REF="$'.concat("{COMPOSE_GIT_REF:-$", '{RELEASE_TAG}}"'),
    );
    expect(workflow).toContain('COMPOSE_GIT_REF="$'.concat('{RELEASE_TAG}"'));
  });

  it("writes the Google Calendar notification token with Google credentials", () => {
    const workflow = readRepoFile(".github/workflows/_deploy-environment.yml");

    expect(workflow).toContain(
      "GCAL_NOTIFICATION_TOKEN: $".concat(
        "{{ secrets.GCAL_NOTIFICATION_TOKEN }}",
      ),
    );
    expect(workflow).toContain(
      'notificationToken: \\"$'.concat('{GCAL_NOTIFICATION_TOKEN}\\"'),
    );
  });

  it("builds cloud deploy web images from a GitHub-only Dockerfile with PostHog config", () => {
    const workflow = readRepoFile(".github/workflows/_deploy-environment.yml");
    const dockerfile = readRepoFile(".github/docker/Dockerfile.web");

    expect(workflow).toContain("file: .github/docker/Dockerfile.web");
    expect(workflow).toContain("POSTHOG_KEY=$");
    expect(workflow).toContain("POSTHOG_HOST=$");
    expect(workflow).not.toContain("COMPASS_WEB_BUILD_CONFIG_B64");
    expect(workflow).not.toContain("base64");
    expect(dockerfile).toContain("ARG POSTHOG_KEY=");
    expect(dockerfile).toContain("ARG POSTHOG_HOST=");
    expect(dockerfile).toContain("'posthog:'");
  });

  it("writes Kit email config only for production deploys", () => {
    const workflow = readRepoFile(".github/workflows/_deploy-environment.yml");

    expect(workflow).toContain(
      "KIT_USER_TAG_ID: $".concat(
        "{{ inputs.environment == 'production' && vars.KIT_USER_TAG_ID || '' }}",
      ),
    );
    expect(workflow).toContain(
      "KIT_API_SECRET: $".concat(
        "{{ inputs.environment == 'production' && secrets.KIT_API_SECRET || '' }}",
      ),
    );
    expect(workflow).toContain(
      'if [ "$'.concat('{{ inputs.environment }}" = "production" ]; then'),
    );
    expect(workflow).toContain(
      "Production deploy requires KIT_API_SECRET and KIT_USER_TAG_ID",
    );
    expect(workflow).toContain(
      'if [ -n "$KIT_API_SECRET" ] && [ -n "$KIT_USER_TAG_ID" ]; then',
    );
    expect(workflow).toContain("'email:'");
    expect(workflow).toContain(
      'kitApiSecret: \\"$'.concat('{KIT_API_SECRET}\\"'),
    );
    expect(workflow).toContain(
      'kitUserTagId: \\"$'.concat('{KIT_USER_TAG_ID}\\"'),
    );
  });

  it("runs deploy health checks after each staging deploy", () => {
    const workflow = readRepoFile(".github/workflows/deploy-staging.yml");

    expect(workflow).toContain(
      "uses: ./.github/workflows/deploy-health-check.yml",
    );
    expect(workflow).toContain("needs: deploy-cloud");
    expect(workflow).toContain("environment: staging-cloud");
    expect(workflow).toContain("profile: cloud");
    expect(workflow).toContain("needs: deploy-selfhosted");
    expect(workflow).toContain("environment: staging-selfhosted");
    expect(workflow).toContain("profile: selfhosted");
  });

  it("provides a manual production deploy workflow with cloud health checks", () => {
    const workflow = readRepoFile(".github/workflows/deploy-production.yml");

    expect(workflow).toContain("workflow_dispatch:");
    expect(workflow).not.toContain("workflow_call:");
    expect(workflow).toContain(
      "uses: ./.github/workflows/_deploy-environment.yml",
    );
    expect(workflow).toContain("environment: production");
    expect(workflow).toContain(
      "uses: ./.github/workflows/deploy-health-check.yml",
    );
    expect(workflow).toContain("needs: deploy");
    expect(workflow).toContain("profile: cloud");
  });

  it("provides a reusable deploy health check workflow with Discord failure alerts", () => {
    const workflow = readRepoFile(".github/workflows/deploy-health-check.yml");

    expect(workflow).toContain("workflow_call:");
    expect(workflow).toContain("tag:");
    expect(workflow).toContain("environment:");
    expect(workflow).toContain("profile:");
    expect(workflow).toContain("DISCORD_DEPLOY_WEBHOOK_URL");
    expect(workflow).toContain(
      "EXPECTED_VERSION: $".concat("{{ inputs.tag }}"),
    );
    expect(workflow).toContain(".github/scripts/deploy-health-check.sh");
  });
});

describe("deploy health check script", () => {
  it("accepts an HTML frontend response", async () => {
    const dir = makeTempDir();
    const bodyPath = join(dir, "frontend.html");
    const headersPath = join(dir, "headers.txt");
    writeFileSync(bodyPath, "<!doctype html><html><body>Compass</body></html>");
    writeFileSync(headersPath, "HTTP/2 200\r\ncontent-type: text/html\r\n");

    const result = await runHealthScript(["validate-frontend"], {
      FRONTEND_BODY_FILE: bodyPath,
      FRONTEND_HEADERS_FILE: headersPath,
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("frontend-http");
  });

  it("rejects a non-2xx frontend response", async () => {
    const dir = makeTempDir();
    const bodyPath = join(dir, "frontend.html");
    const headersPath = join(dir, "headers.txt");
    writeFileSync(bodyPath, "<!doctype html><html><body>Compass</body></html>");
    writeFileSync(headersPath, "HTTP/2 503\r\ncontent-type: text/html\r\n");

    const result = await runHealthScript(["validate-frontend"], {
      FRONTEND_BODY_FILE: bodyPath,
      FRONTEND_HEADERS_FILE: headersPath,
    });

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("frontend-http");
  });

  it("rejects a non-HTML frontend response", async () => {
    const dir = makeTempDir();
    const bodyPath = join(dir, "frontend.json");
    const headersPath = join(dir, "headers.txt");
    writeFileSync(bodyPath, '{"ok":true}');
    writeFileSync(
      headersPath,
      "HTTP/2 200\r\ncontent-type: application/json\r\n",
    );

    const result = await runHealthScript(["validate-frontend"], {
      FRONTEND_BODY_FILE: bodyPath,
      FRONTEND_HEADERS_FILE: headersPath,
    });

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("frontend-content-type");
  });

  it("rejects an empty frontend response body", async () => {
    const dir = makeTempDir();
    const bodyPath = join(dir, "frontend.html");
    const headersPath = join(dir, "headers.txt");
    writeFileSync(bodyPath, "");
    writeFileSync(headersPath, "HTTP/2 200\r\ncontent-type: text/html\r\n");

    const result = await runHealthScript(["validate-frontend"], {
      FRONTEND_BODY_FILE: bodyPath,
      FRONTEND_HEADERS_FILE: headersPath,
    });

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("frontend-body");
  });

  it("accepts a frontend version response that matches the release tag", async () => {
    const dir = makeTempDir();
    const bodyPath = join(dir, "version.json");
    writeFileSync(bodyPath, '{"version":"0.5.27"}');

    const result = await runHealthScript(["validate-frontend-version"], {
      FRONTEND_VERSION_BODY_FILE: bodyPath,
      RELEASE_TAG: "v0.5.27",
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("frontend-version");
  });

  it("rejects a frontend version response that does not match the release tag", async () => {
    const dir = makeTempDir();
    const bodyPath = join(dir, "version.json");
    writeFileSync(bodyPath, '{"version":"0.5.26"}');

    const result = await runHealthScript(["validate-frontend-version"], {
      FRONTEND_VERSION_BODY_FILE: bodyPath,
      RELEASE_TAG: "v0.5.27",
    });

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("frontend-version");
    expect(result.stderr).toContain("expected 0.5.27, got 0.5.26");
  });

  it("uses selfhosted profile for selfhosted deployments", async () => {
    const result = await runHealthScriptFunction("remote_compose_prefix", {
      PROFILE: "selfhosted",
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("COMPOSE_PROFILES=selfhosted");
    expect(result.stdout).toContain("docker compose --project-name compass");
  });
});
