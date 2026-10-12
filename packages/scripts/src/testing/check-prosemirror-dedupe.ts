/**
 * ProseMirror throws at runtime when two copies of prosemirror-model load
 * (TipTap list keymaps then fail on Enter/Backspace). Bun can keep nested
 * copies when only some prosemirror packages are pinned, so lint fails if
 * more than one prosemirror-model version is installed.
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const bunStore = join(root, "node_modules/.bun");

if (!existsSync(bunStore)) {
  console.error(
    "check-prosemirror-dedupe: node_modules/.bun missing; run bun install first",
  );
  process.exit(1);
}

const versions = new Set<string>();

for (const entry of readdirSync(bunStore)) {
  const match = /^prosemirror-model@(.+)$/.exec(entry);
  if (!match) continue;

  const packageJsonPath = join(
    bunStore,
    entry,
    "node_modules/prosemirror-model/package.json",
  );
  if (!existsSync(packageJsonPath)) continue;

  const pkg = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
    version?: string;
  };
  if (pkg.version) versions.add(pkg.version);
}

if (versions.size === 0) {
  console.error(
    "check-prosemirror-dedupe: prosemirror-model not installed (calendar-web TipTap deps missing?)",
  );
  process.exit(1);
}

if (versions.size > 1) {
  console.error(
    `check-prosemirror-dedupe: multiple prosemirror-model versions installed: ${[
      ...versions,
    ].join(
      ", ",
    )}. Pin prosemirror packages in package.json resolutions/overrides.`,
  );
  process.exit(1);
}

console.log(
  `check-prosemirror-dedupe passed (prosemirror-model@${[...versions][0]})`,
);
