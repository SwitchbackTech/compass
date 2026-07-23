#!/usr/bin/env bun
import { Glob } from "bun";
import { readFileSync, writeFileSync } from "node:fs";

const patterns = [
  /^\s*beforeEach\(\(\) => \{\s*\n\s*mock\.restore\(\);\s*\n\s*\}\);\n/gm,
  /^\s*beforeEach\(\(\) => mock\.restore\(\)\);\n/gm,
];

let changed = 0;
for (const file of new Glob("packages/backend/**/*.{test,spec}.ts").scanSync(
  ".",
)) {
  const path = file.startsWith("./") ? file : `./${file}`;
  let content = readFileSync(path, "utf8");
  const original = content;
  for (const pattern of patterns) {
    content = content.replace(pattern, "");
  }
  if (content !== original) {
    writeFileSync(path, content);
    changed++;
    console.log(path);
  }
}
console.log(`Updated ${changed} files`);
