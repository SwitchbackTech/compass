import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

export type PreseedHeartbeat = {
  ts: string;
  pid: number;
  phase: string;
  usersDone: number;
  usersTotal: number;
  eventsUpserted: number;
  eventsSkipped: number;
  lastUserId: string | null;
  ratePerMin: number | null;
  detail: string | null;
};

export async function writePreseedHeartbeat(
  outDir: string,
  heartbeat: PreseedHeartbeat,
): Promise<void> {
  const path = join(outDir, "heartbeat.json");
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(heartbeat, null, 2)}\n`, "utf8");
}

export async function writePreseedSuccessMarker(
  outDir: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const path = join(outDir, "SUCCESS.json");
  await mkdir(dirname(path), { recursive: true });
  await writeFile(
    path,
    `${JSON.stringify({ ts: new Date().toISOString(), ...payload }, null, 2)}\n`,
    "utf8",
  );
}

export async function writePreseedFailureMarker(
  outDir: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const path = join(outDir, "failure.json");
  await mkdir(dirname(path), { recursive: true });
  await writeFile(
    path,
    `${JSON.stringify({ ts: new Date().toISOString(), ...payload }, null, 2)}\n`,
    "utf8",
  );
}
