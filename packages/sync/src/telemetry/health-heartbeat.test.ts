import {
  HEALTH_SNAPSHOT_STALE_AFTER_MS,
  isHealthHeartbeatMissing,
} from "@sync/telemetry/health-heartbeat";
import { describe, expect, it } from "bun:test";

describe("isHealthHeartbeatMissing", () => {
  const now = new Date("2026-07-25T02:20:00.000Z");

  it("is missing when no snapshot has ever been emitted", () => {
    expect(isHealthHeartbeatMissing(null, now)).toBe(true);
  });

  it("is healthy within the 10-minute alert window", () => {
    const last = new Date(
      now.getTime() - HEALTH_SNAPSHOT_STALE_AFTER_MS + 1_000,
    );
    expect(isHealthHeartbeatMissing(last, now)).toBe(false);
  });

  it("is missing once the snapshot is older than 10 minutes", () => {
    const last = new Date(now.getTime() - HEALTH_SNAPSHOT_STALE_AFTER_MS - 1);
    expect(isHealthHeartbeatMissing(last, now)).toBe(true);
  });
});
