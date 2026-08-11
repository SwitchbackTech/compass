import {
  type PrincipalId,
  type TenantId,
} from "@core/types/sync/identity.contracts";
import { JOB_PRIORITY } from "@sync/storage/contracts/job.contracts";
import { refreshPrincipalCalendars } from "./connection-refresh.service";
import { describe, expect, it, mock } from "bun:test";

describe("refreshPrincipalCalendars", () => {
  it("enqueues an incrementalPull for each events resource at user priority", async () => {
    const enqueueUrgent = mock(async () => ({
      job: {},
      outcome: "created" as const,
    }));
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

    const requeueFailedByConnection = mock(async () => 0);
    const tally = await refreshPrincipalCalendars(
      {
        resources: {
          listEventsByPrincipal: mock(async () => resources),
        } as never,
        jobs: { enqueueUrgent, requeueFailedByConnection } as never,
      },
      "t1" as TenantId,
      "p1" as PrincipalId,
      () => new Date("2026-07-31T12:00:00.000Z"),
    );

    expect(tally).toEqual({
      resources: 2,
      created: 2,
      boosted: 0,
      requeuedFailed: 0,
      inFlight: 0,
    });
    // One call per distinct connection touched, not per resource.
    expect(requeueFailedByConnection).toHaveBeenCalledTimes(1);
    expect(enqueueUrgent).toHaveBeenCalledTimes(2);
    expect(enqueueUrgent.mock.calls[0]?.[0]).toMatchObject({
      kind: "incrementalPull",
      resourceId: "r1",
      coalescingKey: "incrementalPull:r1",
      priority: JOB_PRIORITY.user,
    });
  });

  it("tallies mixed enqueueUrgent outcomes", async () => {
    const outcomes = [
      "created",
      "boosted",
      "requeuedFailed",
      "inFlight",
    ] as const;
    let i = 0;
    const enqueueUrgent = mock(async () => ({
      job: {},
      outcome: outcomes[i++]!,
    }));
    const resources = outcomes.map((id) => ({
      _id: id,
      tenantId: "t1" as TenantId,
      principalId: "p1" as PrincipalId,
      connectionId: "c1",
    }));

    const requeueFailedByConnection = mock(async () => 2);
    const tally = await refreshPrincipalCalendars(
      {
        resources: {
          listEventsByPrincipal: mock(async () => resources),
        } as never,
        jobs: { enqueueUrgent, requeueFailedByConnection } as never,
      },
      "t1" as TenantId,
      "p1" as PrincipalId,
    );

    // The 2 revived-by-connection non-incrementalPull jobs fold into the same
    // requeuedFailed tally as the enqueueUrgent-outcome "requeuedFailed": 1.
    expect(tally).toEqual({
      resources: 4,
      created: 1,
      boosted: 1,
      requeuedFailed: 3,
      inFlight: 1,
    });
  });
});
