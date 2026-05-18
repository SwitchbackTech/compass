import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const repoRoot = join(import.meta.dir, "..");

function readRepoFile(path: string): string {
  return readFileSync(join(repoRoot, path), { encoding: "utf8" });
}

describe("self-host docker compose", () => {
  it("builds the backend image without build-time Compass config", () => {
    const dockerfile = readRepoFile("self-host/Dockerfile.backend");

    expect(dockerfile).toContain("RUN bun run build:backend");
    expect(dockerfile).not.toContain("--environment");
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
      'COMPOSE_PROFILES="' + "$" + '{COMPOSE_PROFILES-selfhost}"',
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
});
