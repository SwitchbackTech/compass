import { describe, expect, it } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const repoRoot = join(import.meta.dir, "..");
const passwordOnlyConfig = `
compose:
  version: latest
runtime:
  nodeEnv: production
  timezone: Etc/UTC
web:
  port: 9080
  url: http://localhost:9080
backend:
  port: 3000
  apiUrl: http://localhost:3000/api
  originsAllowed:
    - http://localhost:9080
  compassToken: real-compass-token
mongo:
  username: compass
  password: real-mongo-password
  replicaSetKey: real-replica-key
  uri: mongodb://compass:real-mongo-password@mongo:27017/prod_calendar?authSource=admin&replicaSet=rs0
supertokens:
  uri: http://supertokens:3567
  key: real-supertokens-key
  postgres:
    user: supertokens
    password: real-postgres-password
    database: supertokens
`;

function readRepoFile(path: string): string {
  return readFileSync(join(repoRoot, path), { encoding: "utf8" });
}

function runInstallerSecretValidation(config: string) {
  const installDir = mkdtempSync(join(tmpdir(), "compass-install-"));
  writeFileSync(join(installDir, "compass.yaml"), config);

  try {
    return spawnSync(
      "sh",
      [
        "-c",
        `eval "$(awk '$0=="check_install_dir"{exit} {print}' self-host/install.sh)"; validate_existing_env_secrets`,
      ],
      {
        cwd: repoRoot,
        encoding: "utf8",
        env: {
          ...process.env,
          COMPASS_HOME: installDir,
        },
      },
    );
  } finally {
    rmSync(installDir, { recursive: true, force: true });
  }
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

  it("allows existing password-only configs without a Google notification token", () => {
    const result = runInstallerSecretValidation(passwordOnlyConfig);

    expect(result.status).toBe(0);
    expect(result.stderr).not.toContain("google.notificationToken");
  });

  it("still rejects placeholder Google notification tokens when present", () => {
    const result = runInstallerSecretValidation(`${passwordOnlyConfig}
google:
  notificationToken: change-me-gcal-notification-token-32chars
`);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      "still has the template placeholder for google.notificationToken",
    );
  });
});

describe("staging deploy workflow", () => {
  it("writes the Google Calendar notification token with Google credentials", () => {
    const workflow = readRepoFile(".github/workflows/deploy-staging.yml");

    expect(workflow).toContain(
      [
        "GCAL_NOTIFICATION_TOKEN: $",
        "{{ secrets.STAGING_GCAL_NOTIFICATION_TOKEN }}",
      ].join(""),
    );
    expect(workflow).toContain(
      ['notificationToken: \\"$', '{GCAL_NOTIFICATION_TOKEN}\\"'].join(""),
    );
  });
});
