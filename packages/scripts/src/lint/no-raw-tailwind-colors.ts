/**
 * Enforces the rule from AGENTS.md: "New web styles should use Tailwind semantic
 * colors from packages/web/src/index.css, not raw colors like bg-blue-300."
 *
 * Exits with code 1 if any violations are found.
 *
 * Usage: bun packages/scripts/src/lint/no-raw-tailwind-colors.ts
 */

import { join } from "node:path";

const PALETTE_COLORS = [
  "slate",
  "gray",
  "zinc",
  "neutral",
  "stone",
  "red",
  "orange",
  "amber",
  "yellow",
  "lime",
  "green",
  "emerald",
  "teal",
  "cyan",
  "sky",
  "blue",
  "indigo",
  "violet",
  "purple",
  "fuchsia",
  "pink",
  "rose",
  // Project-specific raw names still in colors.ts
  "darkBlue",
  "blueGray",
  "white",
  "black",
];

const UTILITIES = [
  "bg",
  "text",
  "border",
  "ring",
  "from",
  "to",
  "via",
  "fill",
  "stroke",
  "placeholder",
  "outline",
  "decoration",
  "shadow",
  "accent",
  "caret",
  "divide",
];

const RAW_COLOR_RE = new RegExp(
  `\\b(${UTILITIES.join("|")})-(${PALETTE_COLORS.join("|")})-[0-9]+\\b`,
  "g",
);

const SCAN_ROOT = join(import.meta.dir, "../../../web/src");

type Violation = { file: string; line: number; col: number; match: string };

async function scanFile(filePath: string): Promise<Violation[]> {
  const content = await Bun.file(filePath).text();
  const violations: Violation[] = [];

  let lineNum = 0;
  for (const line of content.split("\n")) {
    lineNum++;
    RAW_COLOR_RE.lastIndex = 0;
    let m = RAW_COLOR_RE.exec(line);
    while (m !== null) {
      violations.push({
        file: filePath,
        line: lineNum,
        col: m.index + 1,
        match: m[0],
      });
      m = RAW_COLOR_RE.exec(line);
    }
  }

  return violations;
}

async function main() {
  const glob = new Bun.Glob("**/*.{ts,tsx}");
  const allViolations: Violation[] = [];

  for await (const rel of glob.scan({ cwd: SCAN_ROOT })) {
    const abs = join(SCAN_ROOT, rel);
    const violations = await scanFile(abs);
    allViolations.push(...violations);
  }

  if (allViolations.length === 0) {
    console.log("✓ No raw Tailwind palette color classes found.");
    process.exit(0);
  }

  console.error(
    `\n✗ Found ${allViolations.length} raw Tailwind color class(es). Use semantic tokens from packages/web/src/index.css instead.\n`,
  );
  for (const v of allViolations) {
    const rel = v.file
      .replace(`${SCAN_ROOT}/`, "")
      .replace(`${SCAN_ROOT}\\`, "");
    console.error(`  ${rel}:${v.line}:${v.col}  \`${v.match}\``);
  }
  console.error(
    "\nSee AGENTS.md and packages/web/src/index.css for available semantic tokens.\n",
  );
  process.exit(1);
}

main();
