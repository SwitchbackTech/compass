import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

const DEPLOY_WORKFLOW = ".github/workflows/_deploy-environment.yml";
const HEALTH_CHECK_SCRIPT = ".github/scripts/deploy-health-check.sh";

describe("deploy sync config", () => {
  it("writes sync.postConnectRedirectUrl from FRONTEND_URL in full calendar deploy", () => {
    const workflow = readFileSync(DEPLOY_WORKFLOW, "utf8");
    expect(workflow).toContain("FRONTEND_URL: ${{ vars.FRONTEND_URL }}");
    expect(workflow).toContain('postConnectRedirectUrl: \\"${FRONTEND_URL}\\"');
    expect(workflow).toContain('callbackBaseUrl: \\"${FRONTEND_URL}\\"');
  });

  it("health check verifies sync.postConnectRedirectUrl on cloud deploys", () => {
    const script = readFileSync(HEALTH_CHECK_SCRIPT, "utf8");
    expect(script).toContain("remote_check_sync_post_connect_redirect");
    expect(script).toContain(
      'run_check "sync-post-connect-redirect" remote_check_sync_post_connect_redirect',
    );
    expect(script).toContain(
      "compass.yaml sync.postConnectRedirectUrl is not set",
    );
  });
});
