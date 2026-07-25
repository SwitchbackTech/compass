import { SYNC_HEALTH_SNAPSHOT_EVENT } from "@core/types/sync/health.contracts";
import {
  SYNC_HEALTH_CONNECTION_DISTRIBUTION_HOGQL,
  SYNC_HEALTH_FRESHNESS_HOGQL,
  SYNC_HEALTH_HEARTBEAT_HOGQL,
} from "@sync/telemetry/health-snapshot.queries";
import { describe, expect, it } from "bun:test";

describe("sync health HogQL fixtures", () => {
  it("scopes every fixture to the sanitized snapshot event", () => {
    for (const query of [
      SYNC_HEALTH_CONNECTION_DISTRIBUTION_HOGQL,
      SYNC_HEALTH_FRESHNESS_HOGQL,
      SYNC_HEALTH_HEARTBEAT_HOGQL,
    ]) {
      expect(query).toContain(SYNC_HEALTH_SNAPSHOT_EVENT);
      expect(query).not.toContain("title");
      expect(query).not.toContain("refresh_token");
      expect(query).not.toContain("principalId");
    }
  });
});
