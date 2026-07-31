import {
  type PrincipalId,
  type TenantId,
} from "@core/types/sync/identity.contracts";
import { refreshPrincipalCalendars } from "./connection-refresh.service";
import { describe, expect, it, mock } from "bun:test";

describe("refreshPrincipalCalendars", () => {
  it("enqueues an incrementalPull for each events resource", async () => {
    const enqueue = mock(async () => undefined);
    const resources = [
      {
        _id: "r1",
        tenantId: "t1" as TenantId,
        principalId: "p1" as PrincipalId,
        connectionId: "c1",
      },
      {
        _id: "r2",
        tenantId: "t1" as TenantId,
        principalId: "p1" as PrincipalId,
        connectionId: "c1",
      },
    ];

    const enqueued = await refreshPrincipalCalendars(
      {
        resources: {
          listEventsByPrincipal: mock(async () => resources),
        } as never,
        jobs: { enqueue } as never,
      },
      "t1" as TenantId,
      "p1" as PrincipalId,
      () => new Date("2026-07-31T12:00:00.000Z"),
    );

    expect(enqueued).toBe(2);
    expect(enqueue).toHaveBeenCalledTimes(2);
    expect(enqueue.mock.calls[0]?.[0]).toMatchObject({
      kind: "incrementalPull",
      resourceId: "r1",
      coalescingKey: "incrementalPull:r1",
    });
  });
});
