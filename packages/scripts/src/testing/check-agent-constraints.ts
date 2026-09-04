import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

const repoRoot = join(import.meta.dir, "../../../..");

const APP_ENTRY = "packages/web/src/index.tsx";
const CI_WORKFLOW = ".github/workflows/test-unit.yml";
const CI_BUN_VERSION = /bun-version:\s*([\d.]+)/g;
const OVEN_BUN_TAG = /oven\/bun:([^\s]+)/g;
const DOCKERFILE_DIRS = ["self-host", ".github/docker"];

const SOURCE_EXT = /\.(ts|tsx)$/;

/** Existing component barrels. Do not add paths; delete these in a follow-up. */
export const BARREL_ALLOWLIST = new Set([
  "packages/web/src/components/AbsoluteOverflowLoader/index.ts",
  "packages/web/src/components/Tooltip/index.ts",
  "packages/web/src/views/Forms/EventForm/SaveSection/index.ts",
  "packages/web/src/views/GoogleAuthCallback/index.ts",
  "packages/web/src/views/NotFound/index.ts",
]);

/** Existing web tests that still use CSS/`data-*` locators. Do not add paths. */
export const WEB_LOCATOR_ALLOWLIST = new Set([
  "packages/web/src/components/AuthenticatedLayout/AuthenticatedLayout.test.tsx",
  "packages/web/src/components/CommandPalette/CommandPalette.test.tsx",
  "packages/web/src/components/ContextMenu/contextMenuLayering.test.tsx",
  "packages/web/src/components/Focusable/Focusable.test.tsx",
  "packages/web/src/components/SelectView/SelectView.test.tsx",
  "packages/web/src/components/Shortcuts/ShortcutKeys.test.tsx",
  "packages/web/src/components/Shortcuts/ShortcutList.test.tsx",
  "packages/web/src/components/Sidebar/CalendarList/AnonymousCalendarRow.test.tsx",
  "packages/web/src/components/Sidebar/MonthPicker/MonthPicker.test.tsx",
  "packages/web/src/components/Tooltip/TooltipWrapper.test.tsx",
  "packages/web/src/grid/components/EventCard.test.tsx",
  "packages/web/src/grid/components/EventGrid.test.tsx",
  "packages/web/src/grid/components/TimedGrid.test.tsx",
  "packages/web/src/shortcuts/edit-sequence/EditSequenceMenu.test.tsx",
  "packages/web/src/shortcuts/form-digit-jump/FormDigitHintOverlay.test.tsx",
  "packages/web/src/shortcuts/page-jump/PageJumpHintOverlay.test.tsx",
  "packages/web/src/shortcuts/shift-hint/ShiftHintOverlay.test.tsx",
  "packages/web/src/views/Forms/EventForm/DateControlsSection/RecurrenceSection/RecurrenceSection.test.tsx",
  "packages/web/src/views/Forms/EventForm/EventForm.readOnly.test.tsx",
  "packages/web/src/views/Life/LifeView.test.tsx",
]);

/**
 * Backend tests that still import the mongoService singleton.
 * Follow-up: migrate to setupTestDb. Do not add paths.
 * scripts `*.db.test.ts` and sync's `sync-mongo.service` are out of scope.
 */
export const MONGO_SERVICE_TEST_ALLOWLIST = new Set([
  "packages/backend/src/auth/services/google/google.auth.service.db.test.ts",
  "packages/backend/src/billing/billing.guard.db.test.ts",
  "packages/backend/src/billing/services/billing.service.db.test.ts",
  "packages/backend/src/billing/services/billing.webhook.service.db.test.ts",
  "packages/backend/src/billing/services/stripe.service.db.test.ts",
  "packages/backend/src/calendar/services/calendar.service.db.test.ts",
  "packages/backend/src/common/services/mongo.service.test.ts",
  "packages/backend/src/health/controllers/health.controller.db.test.ts",
  "packages/backend/src/user/controllers/user.controller.db.test.ts",
  "packages/backend/src/user/services/user.service.db.test.ts",
]);

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

export function ovenBunVersion(tag: string): string {
  return tag.replace(/-slim$/, "");
}

export function scanBunDockerfilePins(root = repoRoot): ConstraintHit[] {
  const hits: ConstraintHit[] = [];
  const workflowPath = join(root, CI_WORKFLOW);
  if (!existsSync(workflowPath)) {
    hits.push({ path: CI_WORKFLOW, rule: "bun-pin", line: 1 });
    return hits;
  }

  const workflow = readFileSync(workflowPath, "utf8");
  const ciVersions = [
    ...new Set([...workflow.matchAll(CI_BUN_VERSION)].map((match) => match[1])),
  ];
  if (ciVersions.length !== 1 || ciVersions[0] === undefined) {
    hits.push({ path: CI_WORKFLOW, rule: "bun-pin", line: 1 });
    return hits;
  }
  const expected = ciVersions[0];

  for (const relDir of DOCKERFILE_DIRS) {
    const absDir = join(root, relDir);
    if (!existsSync(absDir)) continue;
    for (const name of readdirSync(absDir)) {
      if (!name.startsWith("Dockerfile")) continue;
      const rel = `${relDir}/${name}`;
      const source = readFileSync(join(root, rel), "utf8");
      for (const match of source.matchAll(OVEN_BUN_TAG)) {
        const tag = match[1] ?? "";
        if (ovenBunVersion(tag) === expected) continue;
        const line = source.slice(0, match.index ?? 0).split("\n").length;
        hits.push({ path: rel, rule: "bun-pin", line });
      }
    }
  }
  return hits;
}

export function scanConstraints(root = repoRoot): ConstraintHit[] {
  const hits: ConstraintHit[] = [];
  for (const file of walk(join(root, "packages"))) {
    const rel = posixRel(root, file);
    const source = readFileSync(file, "utf8");

    if (isIndexModule(rel) && rel !== APP_ENTRY && isBarrelSource(source)) {
      if (!BARREL_ALLOWLIST.has(rel)) {
        hits.push({ path: rel, rule: "barrel", line: 1 });
      }
    }

    if (isWebTest(rel) && !WEB_LOCATOR_ALLOWLIST.has(rel)) {
      for (const line of locatorHits(source)) {
        hits.push({ path: rel, rule: "web-locator", line });
      }
    }

    if (isBackendOrSyncTest(rel) && !MONGO_SERVICE_TEST_ALLOWLIST.has(rel)) {
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
  const hits = [...scanConstraints(), ...scanBunDockerfilePins()];
  if (hits.length > 0) {
    console.error("Agent constraint violations:");
    for (const hit of hits) {
      console.error(`${hit.path}:${hit.line} ${hit.rule}`);
    }
    process.exit(1);
  }
}
