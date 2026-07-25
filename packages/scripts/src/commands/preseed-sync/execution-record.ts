import {
  type PreseedExecutionRecord,
  PreseedExecutionRecordSchema,
  type PreseedMode,
  type PreseedParityReport,
  type PreseedPhase,
} from "@scripts/commands/preseed-sync/report.types";
import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export type PhaseExecutionSummary = {
  name: "inventory" | "connections" | "state" | "pending";
  startedAt: string;
  finishedAt: string;
  dryRun: boolean;
  summaryCounts: Record<string, number>;
  artifactPath: string;
};

export function buildExecutionRecord(args: {
  startedAt: Date;
  finishedAt: Date;
  argv: string[];
  dryRun: boolean;
  mode: PreseedMode;
  phase: PreseedPhase;
  userIdFilter: string[] | null;
  outDir: string | null;
  gitSha: string | null;
  compassApiMongoDbName: string | null;
  syncMongoDbName: string | null;
  phasesExecuted: PhaseExecutionSummary[];
  parityReport: PreseedParityReport;
  exitCode: 0 | 1;
}): PreseedExecutionRecord {
  return PreseedExecutionRecordSchema.parse({
    schemaVersion: 1,
    kind: "sync-preseed-execution",
    runId: randomUUID(),
    startedAt: args.startedAt.toISOString(),
    finishedAt: args.finishedAt.toISOString(),
    durationMs: Math.max(
      0,
      args.finishedAt.getTime() - args.startedAt.getTime(),
    ),
    command: {
      argv: args.argv,
      dryRun: args.dryRun,
      apply: !args.dryRun,
      mode: args.mode,
      phase: args.phase,
      userIdFilter: args.userIdFilter,
      outDir: args.outDir,
    },
    environment: {
      gitSha: args.gitSha,
      nodeBun: process.versions.bun ?? process.version,
      compassApiMongoDbName: args.compassApiMongoDbName,
      syncMongoDbName: args.syncMongoDbName,
      workersEnabledByThisTool: false,
      callbacksEnabledByThisTool: false,
      sourceRecordsDeletedByThisTool: false,
    },
    phasesExecuted: args.phasesExecuted,
    parity: {
      ok: args.parityReport.parity.ok,
      blockerCount: args.parityReport.parity.blockers.length,
      warningCount: args.parityReport.parity.warnings.length,
      reportPath: "parity-report.json",
    },
    exitCode: args.exitCode,
  });
}

/**
 * Write immutable preseed artifacts. Refuses to overwrite an existing
 * execution-record.json in the destination directory.
 */
export function writePreseedArtifacts(
  outDir: string,
  parityReport: PreseedParityReport,
  executionRecord: PreseedExecutionRecord,
  phaseArtifacts: Array<{ relativePath: string; json: unknown }>,
): void {
  mkdirSync(outDir, { recursive: true });
  mkdirSync(join(outDir, "phases"), { recursive: true });

  const executionPath = join(outDir, "execution-record.json");
  if (existsSync(executionPath)) {
    throw new Error(
      `Refusing to overwrite immutable execution record at ${executionPath}; pass a fresh --out directory`,
    );
  }

  writeFileSync(
    join(outDir, "parity-report.json"),
    `${JSON.stringify(parityReport, null, 2)}\n`,
    "utf8",
  );

  for (const artifact of phaseArtifacts) {
    writeFileSync(
      join(outDir, artifact.relativePath),
      `${JSON.stringify(artifact.json, null, 2)}\n`,
      "utf8",
    );
  }

  writeFileSync(
    executionPath,
    `${JSON.stringify(executionRecord, null, 2)}\n`,
    "utf8",
  );
}
