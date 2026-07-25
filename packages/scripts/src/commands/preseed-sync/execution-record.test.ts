import {
  buildExecutionRecord,
  writePreseedArtifacts,
} from "@scripts/commands/preseed-sync/execution-record";
import { type PreseedParityReport } from "@scripts/commands/preseed-sync/report.types";
import { afterEach, describe, expect, it } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const parityReport = {
  generatedAt: "2026-07-25T00:00:00.000Z",
  dryRun: true,
  mode: "live",
  phase: "all",
  userIdFilter: null,
  phases: {},
  parity: {
    ok: true,
    blockers: [],
    warnings: [],
    counts: {
      unexplainedSkips: 0,
      duplicateIdentities: 0,
      orphans: 0,
      missingAuthority: 0,
      credentialVerifyFailures: 0,
      deltaCreates: 0,
      deltaUpdates: 0,
    },
  },
} satisfies PreseedParityReport;

describe("execution-record", () => {
  const dirs: string[] = [];
  afterEach(() => {
    for (const dir of dirs) {
      rmSync(dir, { recursive: true, force: true });
    }
    dirs.length = 0;
  });

  it("builds a schema-valid record with cutover safety flags false", () => {
    const startedAt = new Date("2026-07-25T00:00:00.000Z");
    const finishedAt = new Date("2026-07-25T00:00:01.000Z");
    const record = buildExecutionRecord({
      startedAt,
      finishedAt,
      argv: ["--mode", "live"],
      dryRun: true,
      mode: "live",
      phase: "all",
      userIdFilter: null,
      outDir: "/tmp/preseed",
      gitSha: "abc",
      compassApiMongoDbName: "dev_calendar",
      syncMongoDbName: "compass_sync",
      phasesExecuted: [],
      parityReport,
      exitCode: 0,
    });

    expect(record.kind).toBe("sync-preseed-execution");
    expect(record.durationMs).toBe(1000);
    expect(record.environment.workersEnabledByThisTool).toBe(false);
    expect(record.environment.callbacksEnabledByThisTool).toBe(false);
    expect(record.environment.sourceRecordsDeletedByThisTool).toBe(false);
  });

  it("refuses to overwrite an existing execution record", () => {
    const dir = mkdtempSync(join(tmpdir(), "preseed-"));
    dirs.push(dir);
    const record = buildExecutionRecord({
      startedAt: new Date(),
      finishedAt: new Date(),
      argv: [],
      dryRun: true,
      mode: "live",
      phase: "inventory",
      userIdFilter: null,
      outDir: dir,
      gitSha: null,
      compassApiMongoDbName: null,
      syncMongoDbName: null,
      phasesExecuted: [],
      parityReport,
      exitCode: 0,
    });

    writePreseedArtifacts(dir, parityReport, record, []);
    expect(() => writePreseedArtifacts(dir, parityReport, record, [])).toThrow(
      /Refusing to overwrite immutable execution record/,
    );
  });
});
