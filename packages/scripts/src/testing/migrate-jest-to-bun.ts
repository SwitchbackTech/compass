#!/usr/bin/env bun
/**
 * Mechanical jest -> bun:test migration for test files.
 * Run from repo root: bun packages/scripts/src/testing/migrate-jest-to-bun.ts
 */
import { Glob } from "bun";
import { readFileSync, writeFileSync } from "node:fs";

const PATTERNS = [
  "packages/backend/src/**/*.{test,spec}.ts",
  "packages/core/src/**/*.{test,spec}.ts",
  "packages/scripts/src/**/*.{test,spec}.ts",
  "packages/sync/src/**/*.{test,spec}.ts",
  "packages/backend/src/__tests__/**/*.{test,spec}.ts",
  "packages/backend/src/__tests__/**/*.ts",
  "packages/core/src/__tests__/**/*.ts",
];

const SKIP = [
  "core.jest-compat",
  "apply-bun-jest-compat",
  "patched-jest",
  "migrate-jest-to-bun",
];

function migrateFile(path: string): boolean {
  if (SKIP.some((s) => path.includes(s))) return false;

  let content = readFileSync(path, "utf8");
  const original = content;

  if (!content.includes("jest.")) return false;

  // Add bun:test imports if needed
  const needsMock = /\bjest\.fn\b/.test(content);
  const needsSpyOn = /\bjest\.spyOn\b/.test(content);
  const needsMockRestore =
    /\bjest\.(clearAllMocks|restoreAllMocks|resetAllMocks|resetModules)\b/.test(
      content,
    );

  if (needsMock || needsSpyOn || needsMockRestore) {
    const bunImportMatch = content.match(
      /import\s+\{([^}]+)\}\s+from\s+["']bun:test["']/,
    );
    if (bunImportMatch) {
      const names = new Set(
        bunImportMatch[1]!.split(",").map((s) => s.trim().split(/\s+/).pop()!),
      );
      if (needsMock) names.add("mock");
      if (needsSpyOn) names.add("spyOn");
      if (needsMockRestore) names.add("mock");
      const sorted = [...names].sort().join(", ");
      content = content.replace(
        bunImportMatch[0],
        `import { ${sorted} } from "bun:test"`,
      );
    } else {
      const imports: string[] = [];
      if (needsMock || needsMockRestore) imports.push("mock");
      if (needsSpyOn) imports.push("spyOn");
      content = `import { ${imports.join(", ")} } from "bun:test";\n${content}`;
    }
  }

  content = content.replace(/\bjest\.fn\b/g, "mock");
  content = content.replace(/\bjest\.spyOn\b/g, "spyOn");
  content = content.replace(/\bjest\.clearAllMocks\b/g, "mock.clearAllMocks");
  content = content.replace(/\bjest\.restoreAllMocks\b/g, "mock.restore");
  content = content.replace(/\bjest\.resetAllMocks\b/g, "mock.clearAllMocks");
  content = content.replace(/\bjest\.resetModules\b/g, "mock.restore");
  content = content.replace(/\bjest\.MockedFunction\b/g, "Mock");
  content = content.replace(/\bjest\.Mock\b/g, "Mock");
  content = content.replace(/\bjest\.SpyInstance\b/g, "SpyInstance");
  content = content.replace(/\bjest\.mocked\(/g, "(");

  if (content !== original) {
    writeFileSync(path, content);
    return true;
  }
  return false;
}

let changed = 0;
for (const pattern of PATTERNS) {
  for (const file of new Glob(pattern).scanSync(".")) {
    const path = file.startsWith("./") ? file : `./${file}`;
    if (migrateFile(path)) {
      changed++;
      console.log(`migrated: ${path}`);
    }
  }
}

console.log(`\nDone. ${changed} files updated.`);
