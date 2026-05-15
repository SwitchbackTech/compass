import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const repoRoot = join(import.meta.dir, "..");

function readRepoFile(path: string): string {
  return readFileSync(join(repoRoot, path), { encoding: "utf8" });
}

describe("self-host docker compose", () => {
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

describe("staging deploy workflow", () => {
  it("writes the Google Calendar notification token with Google credentials", () => {
    const workflow = readRepoFile(".github/workflows/deploy-staging.yml");

    expect(workflow).toContain(
      "GCAL_NOTIFICATION_TOKEN: ${{ secrets.STAGING_GCAL_NOTIFICATION_TOKEN }}",
    );
    expect(workflow).toContain(
      'notificationToken: \\"${GCAL_NOTIFICATION_TOKEN}\\"',
    );
  });
});
