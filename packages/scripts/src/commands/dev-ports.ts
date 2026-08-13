import { parse, parseDocument } from "yaml";
import { execSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import path from "node:path";

/**
 * Preflight for `bun run dev:web` / `bun run dev:backend`.
 *
 * Every git worktree gets its own gitignored compass.yaml, and they all
 * default to the same ports (web 9080, backend 3000), so the second worktree
 * to start a dev server crashes with EADDRINUSE. This script assigns each
 * worktree its own port pair once, at config level, keeping web.url,
 * backend.apiUrl, and originsAllowed consistent — so the app code never has
 * to care that ports differ between worktrees.
 *
 * Conflicts are detected from sibling worktrees' compass.yaml files (not live
 * sockets), which makes reruns no-ops even while this worktree's own servers
 * are running. If dev:web and dev:backend preflight simultaneously in a fresh
 * worktree, both compute the same answer from the same sibling claims; the
 * double write is harmless.
 *
 * Separately, once mongo.uri is present (the worktree can already run
 * dev:backend for the main app), this also fills in a missing sync: block —
 * see ensureSyncConfigFile. None of those fields need a value from outside
 * this file: internalAuthToken is a shared secret two locally-run processes
 * compare to themselves, serviceUrl/callbackBaseUrl are just this worktree's
 * own sync port, and mongoUri reuses mongo.uri's host/credentials against an
 * isolated database name (the pattern self-host/compass.example.yaml already
 * documents for reusing root credentials against compass_sync).
 *
 * SYNC_PORT_BASE (3010) sits inside BACKEND_PORT_BASE's own search range
 * (3000 + 0..50), matching the 3010 convention baked into self-host's docker
 * network, deploy config, and the sync package's own default — moving it
 * would ripple far outside this file. So a sync candidate is checked against
 * every worktree's backend.port too, not just sibling sync.port claims.
 * The reverse isn't checked (findNextPorts doesn't know about sync ports):
 * a backend reassignment landing on an already-claimed sync port is a real
 * but narrower gap, since it needs a worktree to already have hit its own
 * default-pair collision to even search past the base.
 */

export const WEB_PORT_BASE = 9080;
export const BACKEND_PORT_BASE = 3000;
export const SYNC_PORT_BASE = 3010;
const SYNC_DATABASE_NAME = "compass_sync";

export interface DevPorts {
  web: number;
  backend: number;
}

// Which dev server is launching, so the port-in-use warning only covers the
// service that's actually about to bind. Port reassignment stays pair-based.
export type Scope = "web" | "backend";

export function readPorts(yamlText: string): DevPorts | null {
  try {
    const config = parse(yamlText) as {
      web?: { port?: string | number };
      backend?: { port?: string | number };
    };
    return {
      web: Number(config?.web?.port) || WEB_PORT_BASE,
      backend: Number(config?.backend?.port) || BACKEND_PORT_BASE,
    };
  } catch {
    return null;
  }
}

/**
 * Rewrites the port-derived fields of a compass.yaml document, preserving
 * comments, formatting, and everything else (secrets included). Returns null
 * when web.url/backend.apiUrl don't match the plain localhost pattern (e.g.
 * a cloudflare tunnel or real domain) — those setups manage ports manually.
 */
export function reassignPorts(yamlText: string, next: DevPorts): string | null {
  const current = readPorts(yamlText);
  if (!current) return null;

  const doc = parseDocument(yamlText);
  const webUrl = doc.getIn(["web", "url"]);
  const apiUrl = doc.getIn(["backend", "apiUrl"]);

  if (
    webUrl !== `http://localhost:${current.web}` ||
    apiUrl !== `http://localhost:${current.backend}/api`
  ) {
    return null;
  }

  doc.setIn(["web", "port"], next.web);
  doc.setIn(["web", "url"], `http://localhost:${next.web}`);
  doc.setIn(["backend", "port"], next.backend);
  doc.setIn(["backend", "apiUrl"], `http://localhost:${next.backend}/api`);

  const origins = doc.getIn(["backend", "originsAllowed"]);
  if (Array.isArray((origins as { items?: unknown[] })?.items)) {
    const oldToNew: Record<string, string> = {
      [`http://localhost:${current.web}`]: `http://localhost:${next.web}`,
      [`http://localhost:${current.backend}`]: `http://localhost:${next.backend}`,
    };
    const rewritten = ((origins as { toJSON(): string[] }).toJSON() ?? []).map(
      (origin) => oldToNew[origin] ?? origin,
    );
    doc.setIn(["backend", "originsAllowed"], rewritten);
  }

  return doc.toString();
}

export function readSyncPort(yamlText: string): number {
  try {
    const config = parse(yamlText) as { sync?: { port?: string | number } };
    return Number(config?.sync?.port) || SYNC_PORT_BASE;
  } catch {
    return SYNC_PORT_BASE;
  }
}

/**
 * Same host/credentials as mongoUri, database segment swapped for an
 * isolated one — the reuse pattern self-host/compass.example.yaml documents
 * for mongoUri. Returns null for a shape this can't confidently rewrite
 * (leaves sync: unconfigured rather than writing something wrong).
 */
export function deriveSyncMongoUri(mongoUri: string): string | null {
  const match = mongoUri.match(/^(mongodb(?:\+srv)?:\/\/[^/]+\/)[^/?]*(.*)$/);
  if (!match) return null;
  const [, prefix, suffix] = match;
  return `${prefix}${SYNC_DATABASE_NAME}${suffix}`;
}

function randomToken(): string {
  return randomBytes(24).toString("hex");
}

/**
 * Fills in a missing sync: block from values already in this same config
 * (mongoUri) or freely synthesizable locally (internalAuthToken is only
 * ever compared to itself; serviceUrl/callbackBaseUrl are localhost URLs
 * derived from the assigned port) — never fetched from anywhere external.
 * Returns null when sync.mongoUri is already present (nothing to do) or
 * mongo.uri is absent or unrecognizable (nothing to derive from).
 */
export function ensureSyncConfig(
  yamlText: string,
  syncPort: number,
  webUrl: string,
): string | null {
  const doc = parseDocument(yamlText);
  if (doc.getIn(["sync", "mongoUri"])) return null;

  const mongoUri = doc.getIn(["mongo", "uri"]);
  if (typeof mongoUri !== "string") return null;

  const syncMongoUri = deriveSyncMongoUri(mongoUri);
  if (!syncMongoUri) return null;

  const base = `http://localhost:${syncPort}`;
  doc.setIn(["sync", "port"], syncPort);
  doc.setIn(["sync", "mongoUri"], syncMongoUri);
  if (!doc.getIn(["sync", "internalAuthToken"])) {
    doc.setIn(["sync", "internalAuthToken"], randomToken());
  }
  doc.setIn(["sync", "serviceUrl"], base);
  doc.setIn(["sync", "callbackBaseUrl"], base);
  doc.setIn(["sync", "postConnectRedirectUrl"], webUrl);

  return doc.toString();
}

function isPortFree(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const tester = createServer();
    tester.unref();
    tester.once("error", () => resolve(false));
    tester.once("listening", () => tester.close(() => resolve(true)));
    tester.listen({ port, host: "0.0.0.0" });
  });
}

function listWorktreePaths(): string[] {
  const output = execSync("git worktree list --porcelain", {
    encoding: "utf8",
  });
  return output
    .split("\n")
    .filter((line) => line.startsWith("worktree "))
    .map((line) => line.slice("worktree ".length));
}

function siblingConfigPaths(root: string): string[] {
  return listWorktreePaths()
    .filter((worktree) => path.resolve(worktree) !== path.resolve(root))
    .map((worktree) => path.join(worktree, "compass.yaml"))
    .filter(existsSync);
}

function readSiblingPorts(root: string): DevPorts[] {
  return siblingConfigPaths(root)
    .map((file) => readPorts(readFileSync(file, "utf8")))
    .filter((ports): ports is DevPorts => ports !== null);
}

function ensureConfigExists(root: string, configPath: string): void {
  if (existsSync(configPath)) return;

  const source =
    siblingConfigPaths(root)[0] ?? path.join(root, "compass.example.yaml");

  copyFileSync(source, configPath);
  console.log(`[dev-ports] created compass.yaml from ${source}`);
}

function isPortsClaimed(ports: DevPorts, claimed: DevPorts[]): boolean {
  return claimed.some(
    (c) => c.web === ports.web || c.backend === ports.backend,
  );
}

function readSiblingSyncPorts(root: string): number[] {
  return siblingConfigPaths(root).map((file) =>
    readSyncPort(readFileSync(file, "utf8")),
  );
}

// Unlike web/backend's findNextPorts, this searches from the base itself
// (offset 0): most worktrees have never had a sync port assigned, so the
// base is usually free, whereas web/backend only call their search once
// the base is already known to be claimed.
async function findNextSyncPort(claimed: number[]): Promise<number | null> {
  for (let offset = 0; offset <= 50; offset++) {
    const candidate = SYNC_PORT_BASE + offset;
    if (claimed.includes(candidate)) continue;
    if (await isPortFree(candidate)) return candidate;
  }
  return null;
}

// Runs independently of (and after) the web/backend port logic above, since
// a worktree can need sync completed whether or not its web/backend ports
// just changed. No-ops for a worktree with no mongo.uri yet (frontend-only)
// or one whose sync: block is already complete.
async function ensureSyncConfigFile(
  root: string,
  configPath: string,
): Promise<void> {
  const yamlText = readFileSync(configPath, "utf8");
  const parsed = parse(yamlText) as {
    web?: { url?: string };
    backend?: { port?: string | number };
    sync?: { mongoUri?: string };
    mongo?: { uri?: string };
  };
  if (parsed?.sync?.mongoUri) return;
  if (!parsed?.mongo?.uri) return;

  // Sync's candidate range (SYNC_PORT_BASE + 0..50) overlaps backend's
  // (BACKEND_PORT_BASE + 0..50): a sibling sync.port claim alone can't stop
  // a candidate from colliding with a worktree's (this one's or a
  // sibling's) already-assigned backend.port, so that pool is claimed too.
  const claimed = [
    ...readSiblingSyncPorts(root),
    ...readSiblingPorts(root).map((p) => p.backend),
    Number(parsed.backend?.port) || BACKEND_PORT_BASE,
  ];
  const syncPort = await findNextSyncPort(claimed);
  if (!syncPort) {
    console.log(
      "[dev-ports] no free sync port found within 50 offsets — leaving sync: unconfigured",
    );
    return;
  }

  const webUrl = parsed.web?.url ?? `http://localhost:${WEB_PORT_BASE}`;
  const rewritten = ensureSyncConfig(yamlText, syncPort, webUrl);
  if (rewritten === null) {
    console.log(
      "[dev-ports] could not derive sync.mongoUri from mongo.uri — leaving sync: unconfigured",
    );
    return;
  }

  writeFileSync(configPath, rewritten);
  console.log(
    `[dev-ports] filled in sync: config (port ${syncPort}) from mongo.uri`,
  );
}

// Smallest offset whose web/backend pair is unclaimed by any sibling
// worktree's compass.yaml and actually free on the OS, or null if none of
// the first 50 offsets work out.
async function findNextPorts(claimed: DevPorts[]): Promise<DevPorts | null> {
  for (let offset = 1; offset <= 50; offset++) {
    const candidate: DevPorts = {
      web: WEB_PORT_BASE + offset,
      backend: BACKEND_PORT_BASE + offset,
    };
    if (isPortsClaimed(candidate, claimed)) continue;
    if (
      (await isPortFree(candidate.web)) &&
      (await isPortFree(candidate.backend))
    ) {
      return candidate;
    }
  }
  return null;
}

// Best-effort: PIDs listening on the given TCP port, or [] if none (or if
// lsof isn't available). Sibling-config detection can't see a stale process
// still bound to this worktree's own port, so we probe the live socket only
// to print a friendlier warning than the raw EADDRINUSE stack trace the dev
// server would otherwise throw.
function portHolders(port: number): string[] {
  try {
    const out = execSync(`lsof -nP -iTCP:${port} -sTCP:LISTEN -t`, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return out
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  } catch {
    return []; // no holder (lsof exits non-zero) or lsof unavailable
  }
}

// `scope` limits the check to the service actually being launched, so
// `dev:backend` doesn't warn about a web server legitimately running on 9080
// (and vice versa). Omitted → check both.
function warnIfPortsHeld(ports: DevPorts, scope?: Scope): void {
  for (const [label, port] of [
    ["web", ports.web],
    ["backend", ports.backend],
  ] as const) {
    if (scope && label !== scope) continue;
    const pids = portHolders(port);
    if (pids.length > 0) {
      console.log(
        `[dev-ports] warning: ${label} port ${port} is already in use by ` +
          `PID ${pids.join(", ")}. The dev server will fail to bind. ` +
          `Free it with: kill ${pids.join(" ")}`,
      );
    }
  }
}

async function main(scope?: Scope): Promise<void> {
  const root = process.cwd();
  const configPath = path.join(root, "compass.yaml");

  try {
    ensureConfigExists(root, configPath);
  } catch {
    return; // not a git repo or no template — nothing to manage
  }

  const yamlText = readFileSync(configPath, "utf8");
  const current = readPorts(yamlText);
  if (!current) return;

  const claimed = readSiblingPorts(root);
  if (!isPortsClaimed(current, claimed)) {
    warnIfPortsHeld(current, scope);
    await ensureSyncConfigFile(root, configPath);
    return;
  }

  const next = await findNextPorts(claimed);
  if (!next) {
    throw new Error("[dev-ports] no free port pair found within 50 offsets");
  }

  const rewritten = reassignPorts(yamlText, next);
  if (rewritten === null) {
    console.log(
      "[dev-ports] compass.yaml uses custom URLs — manage ports manually",
    );
    warnIfPortsHeld(current, scope);
    await ensureSyncConfigFile(root, configPath);
    return;
  }

  writeFileSync(configPath, rewritten);
  console.log(
    `[dev-ports] ports ${current.web}/${current.backend} are claimed by ` +
      `another worktree — reassigned to web ${next.web}, backend ${next.backend}`,
  );
  await ensureSyncConfigFile(root, configPath);
}

if (require.main === module) {
  const arg = process.argv[2];
  const scope: Scope | undefined =
    arg === "web" || arg === "backend" ? arg : undefined;
  main(scope).catch((err) => {
    console.log(err);
    process.exit(1);
  });
}
