import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

const repoRoot = join(import.meta.dir, "../../../..");

const APP_ENTRY = "packages/web/src/index.tsx";

const SOURCE_EXT = /\.(ts|tsx)$/;

export type ConstraintAllow = { glob: string; reason: string };

/**
 * Structural locator exceptions. New tests outside these globs are still
 * flagged, including `packages/web/src/auth/providers/**`.
 */
export const WEB_LOCATOR_ALLOWLIST: ConstraintAllow[] = [
  {
    glob: "packages/web/src/shortcuts/**/*.test.tsx",
    reason:
      "hint overlays and the edit-sequence menu expose data-* roots, not roles",
  },
  {
    glob: "packages/web/src/grid/components/*.test.tsx",
    reason: "grid layers and edge-focus are data-* layout hooks",
  },
  {
    glob: "packages/web/src/components/Sidebar/MonthPicker/*.test.tsx",
    reason: "react-datepicker internals have no accessible names",
  },
  {
    glob: "packages/web/src/components/CommandPalette/*.test.tsx",
    reason: "command rows expose aria-hidden keycaps",
  },
  {
    glob: "packages/web/src/components/ContextMenu/*.test.tsx",
    reason: "the portal menu is class-based, not a named role",
  },
  {
    glob: "packages/web/src/components/Focusable/*.test.tsx",
    reason: "the focus ring is a CSS class with no role",
  },
  {
    glob: "packages/web/src/components/SelectView/*.test.tsx",
    reason: "the open listbox is still a testid surface",
  },
  {
    glob: "packages/web/src/components/Shortcuts/*.test.tsx",
    reason: "keycaps are aria-hidden",
  },
  {
    glob: "packages/web/src/components/Sidebar/CalendarList/*.test.tsx",
    reason: "the color swatch is aria-hidden",
  },
  {
    glob: "packages/web/src/components/Tooltip/*.test.tsx",
    reason: "shortcut-node is a test-only child without a name",
  },
  {
    glob: "packages/web/src/components/AuthenticatedLayout/*.test.tsx",
    reason: "route-outlet fixtures use testids",
  },
  {
    glob: "packages/web/src/views/Forms/EventForm/**/*.test.tsx",
    reason: "recurrence data-selected chips and read-only fieldsets",
  },
  {
    glob: "packages/web/src/views/Life/*.test.tsx",
    reason: "life-grid dots are data-total-dots and ring classes",
  },
];

/**
 * Db tests seed and assert through the mongoService singleton. Sync's
 * `sync-mongo.service` is out of scope. New backend unit tests that are not
 * `*.db.test.ts` still cannot import mongoService.
 */
export const MONGO_SERVICE_TEST_ALLOWLIST: ConstraintAllow[] = [
  {
    glob: "packages/backend/src/**/*.db.test.ts",
    reason:
      "db tests insert and assert via the mongoService singleton until a collection accessor replaces it",
  },
  {
    glob: "packages/backend/src/**/mongo.service.test.ts",
    reason: "this file is the mongoService unit test",
  },
];

const REEXPORT_FROM =
  /export\s+(?:\*|type\s+\{[^}]*\}|\{[^}]*\})\s+from\s+["']/;
const LOCAL_IMPORT =
  /import\s+(?:type\s+)?[\s\S]*?\s+from\s+["']\.\.?\/[^"']+["']/;
const BARE_NAMED_EXPORT = /export\s+\{[^}]+\}\s*;/;
const WEB_LOCATOR =
  /\bgetByTestId\s*\(|\bquerySelector(All)?\s*\(|\bgetByClassName\s*\(/;
const MONGO_SERVICE_IMPORT = /from\s+["'][^"']*(?<!sync-)mongo\.service["']/;
const DUPLICATE_EVENT_SCHEMA =
  /(?:const|let|var)\s+EventSchema\s*=\s*z\.object/;

export type ConstraintHit = { path: string; rule: string; line: number };

export function matchesConstraintAllow(
  path: string,
  allowlist: ConstraintAllow[],
): boolean {
  return allowlist.some((entry) => matchGlob(path, entry.glob));
}

export function matchGlob(path: string, glob: string): boolean {
  const pattern = glob
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*\*\//g, "\0")
    .replace(/\*\*/g, "\0")
    .replace(/\*/g, "[^/]*")
    .replace(/\0/g, "(?:.*/)?");
  return new RegExp(`^${pattern}$`).test(path);
}

export function isBarrelSource(source: string): boolean {
  if (REEXPORT_FROM.test(source)) return true;
  return LOCAL_IMPORT.test(source) && BARE_NAMED_EXPORT.test(source);
}

export function locatorHits(source: string): number[] {
  return lineNumbers(source, WEB_LOCATOR);
}

export function mongoServiceImportHits(source: string): number[] {
  return lineNumbers(source, MONGO_SERVICE_IMPORT);
}

export function duplicateEventSchemaHits(source: string): number[] {
  return lineNumbers(source, DUPLICATE_EVENT_SCHEMA);
}

export function scanConstraints(root = repoRoot): ConstraintHit[] {
  const hits: ConstraintHit[] = [];
  for (const file of walk(join(root, "packages"))) {
    const rel = posixRel(root, file);
    const source = readFileSync(file, "utf8");

    if (isWebTest(rel) && !matchesConstraintAllow(rel, WEB_LOCATOR_ALLOWLIST)) {
      for (const line of locatorHits(source)) {
        hits.push({ path: rel, rule: "web-locator", line });
      }
    }

    if (
      isBackendOrSyncTest(rel) &&
      !matchesConstraintAllow(rel, MONGO_SERVICE_TEST_ALLOWLIST)
    ) {
      for (const line of mongoServiceImportHits(source)) {
        hits.push({ path: rel, rule: "mongoService-import", line });
      }
    }

    if (
      (rel.startsWith("packages/web/") ||
        rel.startsWith("packages/backend/")) &&
      !rel.includes(".test.") &&
      !rel.includes(".spec.")
    ) {
      for (const line of duplicateEventSchemaHits(source)) {
        hits.push({ path: rel, rule: "duplicate-event-schema", line });
      }
    }
  }
  return hits;
}

function isIndexModule(rel: string): boolean {
  return rel.endsWith("/index.ts") || rel.endsWith("/index.tsx");
}

function isWebTest(rel: string): boolean {
  return (
    rel.startsWith("packages/web/") &&
    (rel.endsWith(".test.ts") ||
      rel.endsWith(".test.tsx") ||
      rel.endsWith(".spec.ts") ||
      rel.endsWith(".spec.tsx"))
  );
}

function isBackendOrSyncTest(rel: string): boolean {
  return (
    (rel.startsWith("packages/backend/") || rel.startsWith("packages/sync/")) &&
    (rel.includes(".test.") || rel.includes(".spec."))
  );
}

function lineNumbers(source: string, pattern: RegExp): number[] {
  const flags = pattern.flags.includes("g")
    ? pattern.flags
    : `${pattern.flags}g`;
  const global = new RegExp(pattern.source, flags);
  const lines: number[] = [];
  for (const match of source.matchAll(global)) {
    if (match.index == null) continue;
    lines.push(source.slice(0, match.index).split("\n").length);
  }
  return lines;
}

function walk(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === "build") return [];
      return walk(path);
    }
    if (!SOURCE_EXT.test(entry.name)) return [];
    return [path];
  });
}

function posixRel(root: string, file: string): string {
  return relative(root, file).split("\\").join("/");
}

if (import.meta.main) {
  const hits = scanConstraints();
  if (hits.length > 0) {
    console.error("Agent constraint violations:");
    for (const hit of hits) {
      console.error(`${hit.path}:${hit.line} ${hit.rule}`);
    }
    process.exit(1);
  }
}
