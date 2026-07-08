import { parse, parseDocument } from "yaml";
import { execSync } from "node:child_process";
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
 */

export const WEB_PORT_BASE = 9080;
export const BACKEND_PORT_BASE = 3000;

export interface DevPorts {
  web: number;
  backend: number;
}

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

async function main(): Promise<void> {
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
    return;
  }

  writeFileSync(configPath, rewritten);
  console.log(
    `[dev-ports] ports ${current.web}/${current.backend} are claimed by ` +
      `another worktree — reassigned to web ${next.web}, backend ${next.backend}`,
  );
}

if (require.main === module) {
  main().catch((err) => {
    console.log(err);
    process.exit(1);
  });
}
