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

  it("builds the sync image without build-time Compass config", () => {
    const dockerfile = readRepoFile("self-host/Dockerfile.sync");

    expect(dockerfile).toContain("RUN bun run build:sync");
    expect(dockerfile).not.toContain("--environment");
  });

  it("gates the passive sync service behind its own profile", () => {
    const compose = readFileSync(join(import.meta.dir, "compose.yaml"), {
      encoding: "utf8",
    });

    expect(compose).toContain("switchbacktech/compass-sync:");
    // Liveness probe, not readiness: a store-less passive service stays up.
    expect(compose).toContain("http://127.0.0.1:3010/health/live");
    const syncBlock = compose
      .slice(compose.indexOf("  sync:"))
      .split(/\n {2}\w/)[0];
    // The `sync` profile lets a deploy start the container only where an
    // isolated sync database is provisioned.
    expect(syncBlock).toContain("profiles: [sync]");
    // The read-only root fs needs a writable mount for the logger's log file,
    // or the container crashes on startup.
    expect(syncBlock).toContain("compass_sync_logs:/app/logs");
    expect(compose).toContain("compass_sync_logs:");
  });

  it("omits the backend mongo dependency from the base compose file", () => {
    const compose = readFileSync(join(import.meta.dir, "compose.yaml"), {
      encoding: "utf8",
    });

    // mongo is gated behind the `selfhosted` profile, so a profile-less
    // cloud/Atlas deploy has no mongo container. A hard depends_on in the base
    // file makes that project invalid ("depends on undefined service mongo").
    // `required: false` is the wrong fix: Compose treats an unhealthy optional
    // dependency as satisfied and starts backend before mongo is ready.
    // Match the top-level service definition ("\n  backend:\n", exactly two
    // spaces of indent), not the x-local-bindings anchor ("  backend:
    // &backend-port ...") nor the web service's nested "depends_on: backend:".
    const backendBlock = compose
      .slice(compose.indexOf("\n  backend:\n") + 1)
      .split(/\n {2}\w/)[0];
    expect(backendBlock).not.toContain("mongo:");
    expect(backendBlock).toContain("start_period: 90s");
    expect(compose).toContain("stop_grace_period: 30s");
  });

  it("waits for mongo before starting backend via the selfhosted overlay", () => {
    const overlay = readFileSync(
      join(import.meta.dir, "compose.selfhosted.yaml"),
      { encoding: "utf8" },
    );

    expect(overlay).toContain("depends_on:");
    expect(overlay).toContain("mongo:");
    expect(overlay).toContain("condition: service_healthy");
    expect(overlay).not.toContain("required: false");
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

  it("downloads the selfhosted mongo overlay with the base compose file", () => {
    const installer = readRepoFile("self-host/install.sh");
    const manual = readRepoFile("self-host/install-manual.sh");

    expect(installer).toContain("self-host/compose.selfhosted.yaml");
    expect(manual).toContain("self-host/compose.selfhosted.yaml");
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

  it("updates in place with compose wait", () => {
    const helper = readRepoFile("self-host/compass");

    expect(helper).toContain("compose up -d --remove-orphans --wait");
  });

  it("prunes unused images around update so release tags cannot fill the disk", () => {
    const helper = readRepoFile("self-host/compass");
    const updateBlock = helper.slice(helper.indexOf("\n  update)"));

    expect(updateBlock).toContain("docker image prune -af");
    expect(updateBlock).toContain("compose logs --tail=100 mongo backend");
  });

  it("applies the selfhosted mongo overlay when the selfhosted profile is active", () => {
    const helper = readRepoFile("self-host/compass");

    expect(helper).toContain("compose.selfhosted.yaml");
    expect(helper).toContain("*,selfhosted,*)");
  });
});

describe("staging deploy workflow", () => {
  it("lets the self-host helper default compose profiles when none are set", () => {
    const workflow = readRepoFile(".github/workflows/_deploy-environment.yml");

    expect(workflow).toContain('if [ -n "$DEPLOY_PROFILES" ]; then');
    expect(workflow).toContain("cd ~/compass && ./compass update");
  });

  it("falls back to the release tag when a configured compose ref is unavailable", () => {
    const workflow = readRepoFile(".github/workflows/_deploy-environment.yml");

    expect(workflow).toContain(
      'COMPOSE_GIT_REF="$'.concat("{COMPOSE_GIT_REF:-$", '{RELEASE_TAG}}"'),
    );
    expect(workflow).toContain('COMPOSE_GIT_REF="$'.concat('{RELEASE_TAG}"'));
  });

  it("updates the stack in place without tearing down data services first", () => {
    const workflow = readRepoFile(".github/workflows/_deploy-environment.yml");

    expect(workflow).not.toContain(
      "docker compose --project-name compass -f compose.yaml down",
    );
  });

  it("deploys the selfhosted mongo overlay alongside the base compose file", () => {
    const workflow = readRepoFile(".github/workflows/_deploy-environment.yml");

    expect(workflow).toContain(
      "self-host/compose.selfhosted.yaml -o ~/compass/compose.selfhosted.yaml",
    );
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

  it("configures sync and enables its profile only when both secrets are set", () => {
    const workflow = readRepoFile(".github/workflows/_deploy-environment.yml");

    expect(workflow).toContain(
      "SYNC_MONGO_URI: $".concat("{{ secrets.SYNC_MONGO_URI }}"),
    );
    expect(workflow).toContain(
      "SYNC_INTERNAL_AUTH_TOKEN: $".concat(
        "{{ secrets.SYNC_INTERNAL_AUTH_TOKEN }}",
      ),
    );
    // Both secrets gate a single SYNC_ENABLED flag; a half-provisioned config
    // must never abort the deploy, so there is no `exit` in the sync path.
    expect(workflow).toContain(
      'if [ -n "$SYNC_MONGO_URI" ] && [ -n "$SYNC_INTERNAL_AUTH_TOKEN" ]; then',
    );
    expect(workflow).toContain('SYNC_ENABLED="1"');
    expect(workflow).not.toContain(
      "Sync deploy requires SYNC_INTERNAL_AUTH_TOKEN",
    );
    // Both the config section and the profile gate on the same flag, so the
    // container never starts against a compass.yaml with no sync section.
    expect(workflow).toContain('if [ -n "$SYNC_ENABLED" ]; then');
    expect(workflow).toContain("'sync:'");
    expect(workflow).toContain('mongoUri: \\"$'.concat('{SYNC_MONGO_URI}\\"'));
    expect(workflow).toContain("enforceLeastPrivilege: true");
    expect(workflow).toContain(
      'DEPLOY_PROFILES="$'.concat(
        "{DEPLOY_PROFILES:+$",
        '{DEPLOY_PROFILES},}sync"',
      ),
    );
  });

  it("writes Kit email config whenever the deployment has a secret", () => {
    const workflow = readRepoFile(".github/workflows/_deploy-environment.yml");

    expect(workflow).toContain(
      "KIT_API_SECRET: $".concat("{{ secrets.KIT_API_SECRET }}"),
    );
    expect(workflow).toContain(
      'if [ "$'.concat('{{ inputs.environment }}" = "production" ]; then'),
    );
    expect(workflow).toContain("Production deploy requires KIT_API_SECRET");
    expect(workflow).toContain('if [ -n "$KIT_API_SECRET" ]; then');
    expect(workflow).toContain("'email:'");
    expect(workflow).toContain(
      'kitApiSecret: \\"$'.concat('{KIT_API_SECRET}\\"'),
    );
    expect(workflow).not.toContain("kitUserTagId");
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
