import { SYNC_HEALTH_SNAPSHOT_EVENT } from "@core/types/sync/health.contracts";
import { SYNC_HEALTH_DASHBOARD } from "@sync/telemetry/health-dashboard";
import { describe, expect, it } from "bun:test";

describe("SYNC_HEALTH_DASHBOARD", () => {
  it("defines one primary dashboard with required panels and alerts", () => {
    expect(SYNC_HEALTH_DASHBOARD.name).toBe("Sync health");
    expect(SYNC_HEALTH_DASHBOARD.panels.length).toBeGreaterThanOrEqual(5);
    expect(SYNC_HEALTH_DASHBOARD.alerts).toHaveLength(2);
    for (const panel of SYNC_HEALTH_DASHBOARD.panels) {
      expect(panel.query).toContain(SYNC_HEALTH_SNAPSHOT_EVENT);
      expect(panel.query).not.toContain("refresh_token");
      expect(panel.query).not.toContain("principalId");
    }
  });
});
