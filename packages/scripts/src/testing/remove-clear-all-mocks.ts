#!/usr/bin/env bun
/** Replace mock.clearAllMocks() calls — not available in bun:test. */
import { Glob } from "bun";
import { readFileSync, writeFileSync } from "node:fs";

let changed = 0;
for (const file of new Glob("packages/**/*.{test,spec}.ts").scanSync(".")) {
  const path = file.startsWith("./") ? file : `./${file}`;
  let content = readFileSync(path, "utf8");
  const original = content;
  content = content.replace(
    /^\s*beforeEach\(\(\) => mock\.clearAllMocks\(\)\);\n/gm,
    "",
  );
  content = content.replace(/mock\.clearAllMocks\(\);\n/g, "");
  if (content !== original) {
    writeFileSync(path, content);
    changed++;
  }
}
console.log(`Removed mock.clearAllMocks from ${changed} files`);
