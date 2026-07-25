import { evaluatePreseedParity } from "@scripts/commands/preseed-sync/parity";
import { describe, expect, it } from "bun:test";

describe("evaluatePreseedParity", () => {
  it("treats explained skips as warnings", () => {
    const parity = evaluatePreseedParity(
      {
        connections: {
          generatedAt: "2026-07-25T00:00:00.000Z",
          dryRun: true,
          counts: {
            scanned: 1,
            wouldCreate: 0,
            wouldUpdate: 0,
            created: 0,
            updated: 0,
            skipped: 1,
          },
          results: [
            {
              userId: "u1",
              tenantId: "u1",
              principalId: "u1",
              providerAccountId: null,
              accountEmail: "p@example.com",
              action: "skipped",
              connectionId: null,
              credentialVerified: false,
              skipCategory: "no_google_identity",
              detail: "password-only",
            },
          ],
        },
        providerState: {
          generatedAt: "2026-07-25T00:00:00.000Z",
          dryRun: true,
          counts: {
            usersScanned: 0,
            usersMigrated: 0,
            usersWouldMigrate: 0,
            usersSkipped: 0,
            calendarsCreated: 0,
            calendarsUpdated: 0,
            calendarsWouldCreate: 0,
            calendarsWouldUpdate: 0,
            calendarsSkipped: 0,
            eventsCreated: 0,
            eventsUpdated: 0,
            eventsWouldCreate: 0,
            eventsWouldUpdate: 0,
            eventsSkipped: 1,
            syncResourcesCreated: 0,
            syncResourcesUpdated: 0,
            syncResourcesWouldCreate: 0,
            syncResourcesWouldUpdate: 0,
            syncResourcesSkipped: 0,
            watchesSkippedRewatch: 0,
            unlinkedDeferred: 1,
          },
          users: [],
          skips: [
            {
              category: "unlinked_deferred",
              id: "e1",
              detail: "deferred to S49",
            },
          ],
          samples: [],
        },
      },
      { mode: "live", dryRun: true },
    );

    expect(parity.ok).toBe(true);
    expect(parity.blockers).toHaveLength(0);
    expect(parity.warnings.length).toBeGreaterThan(0);
  });

  it("blocks inventory duplicates and orphans", () => {
    const parity = evaluatePreseedParity(
      {
        inventory: {
          generatedAt: "2026-07-25T00:00:00.000Z",
          dryRun: true,
          source: {
            users: {
              total: 1,
              withGoogle: 1,
              withRefreshToken: 1,
              missingToken: 0,
            },
            calendars: { total: 2, google: 2, local: 0 },
            events: { total: 0, linkedGoogle: 0, unlinked: 0 },
            syncDocs: {
              total: 0,
              eventCursorRows: 0,
              calendarListCursorRows: 0,
            },
            watches: {
              total: 0,
              eventWatches: 0,
              calendarListWatches: 0,
              expired: 0,
            },
          },
          targets: [],
          duplicates: [
            {
              kind: "google_calendar_identity",
              key: "u1:primary",
              count: 2,
              ids: ["c1", "c2"],
            },
          ],
          orphans: [{ kind: "event", id: "e1", reason: "calendar missing" }],
          missingAuthority: [],
          skips: [],
          counts: { scanned: 1, reportable: 1, skipped: 0 },
        },
      },
      { mode: "live", dryRun: true },
    );

    expect(parity.ok).toBe(false);
    expect(parity.blockers.some((b) => b.code === "inventory_duplicate")).toBe(
      true,
    );
    expect(parity.blockers.some((b) => b.code === "inventory_orphan")).toBe(
      true,
    );
  });

  it("allows live creates but blocks frozen residual wouldCreate after apply", () => {
    const phases = {
      connections: {
        generatedAt: "2026-07-25T00:00:00.000Z",
        dryRun: false,
        counts: {
          scanned: 1,
          wouldCreate: 1,
          wouldUpdate: 0,
          created: 0,
          updated: 0,
          skipped: 0,
        },
        results: [],
      },
    };

    const live = evaluatePreseedParity(phases, {
      mode: "live",
      dryRun: false,
    });
    expect(live.ok).toBe(true);

    const frozen = evaluatePreseedParity(phases, {
      mode: "frozen",
      dryRun: false,
    });
    expect(frozen.ok).toBe(false);
    expect(
      frozen.blockers.some((b) => b.code === "frozen_residual_creates"),
    ).toBe(true);
  });
});
