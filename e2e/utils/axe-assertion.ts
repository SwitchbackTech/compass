import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";
import type axe from "axe-core";

// Verified against the installed axe-core version (4.12.1):
// `grep -o 'wcag2[0-9a]*' node_modules/axe-core/axe.js | sort -u` returns
// wcag2a, wcag2aa, wcag21a, wcag21aa, wcag22aa. WCAG 2.2 only added AA-level
// success criteria (no new "A" ones), so wcag22aa is the complete addition -
// there is no wcag22a tag to include. Re-run that grep after bumping
// axe-core to confirm the tag set is still current before changing this.
const WCAG_22_AA_TAGS = [
  "wcag2a",
  "wcag2aa",
  "wcag21a",
  "wcag21aa",
  "wcag22aa",
];

export interface KnownIncompleteResult {
  /** The axe rule id (e.g. "aria-valid-attr-value"). */
  ruleId: string;
  /** Why axe cannot reliably decide this automatically, for this checkpoint. */
  reason: string;
}

export interface AxeCheckOptions {
  /** CSS selector to scope the scan to; omit to scan the whole page. */
  include?: string;
  /** Short label identifying the scanned state, used in failure output. */
  checkpoint?: string;
  /**
   * Axe rule ids allowed to resolve as "incomplete" for this checkpoint,
   * each with a recorded reason. This is not a blanket allowlist - anything
   * incomplete that isn't listed here still doesn't fail the test (per the
   * incomplete-result policy below), but is printed for manual review
   * instead of silently passing through.
   */
  knownIncomplete?: KnownIncompleteResult[];
}

const formatNodes = (nodes: axe.NodeResult[]) =>
  nodes
    .map(
      (node) =>
        `    - ${node.target.join(" ")}\n      ${node.failureSummary?.replace(/\n/g, "\n      ") ?? ""}`,
    )
    .join("\n");

const formatResults = (results: axe.Result[]) =>
  results
    .map(
      (result) =>
        `  [${result.impact ?? "unknown"}] ${result.id}: ${result.help}\n` +
        `    ${result.helpUrl}\n${formatNodes(result.nodes)}`,
    )
    .join("\n\n");

/**
 * Runs Compass's standard axe scan against the given page (or a scoped
 * region within it) and fails on any violation. `incomplete` results are
 * never silently dropped: entries matching `knownIncomplete` are reported as
 * explained; everything else is printed for manual review rather than
 * failing the test, per the incomplete-result policy in
 * docs/development/testing-playbook.md.
 */
export const expectNoAxeViolations = async (
  page: Page,
  { include, checkpoint, knownIncomplete = [] }: AxeCheckOptions = {},
) => {
  let builder = new AxeBuilder({ page }).withTags(WCAG_22_AA_TAGS);
  if (include) {
    builder = builder.include(include);
  }

  const results = await builder.analyze();
  const label = checkpoint ? `[${checkpoint}] ` : "";

  expect(
    results.violations,
    `${label}axe found ${results.violations.length} accessibility violation(s):\n\n${formatResults(results.violations)}`,
  ).toEqual([]);

  const explained = results.incomplete.filter((result) =>
    knownIncomplete.some((known) => known.ruleId === result.id),
  );
  const unexplained = results.incomplete.filter(
    (result) => !knownIncomplete.some((known) => known.ruleId === result.id),
  );

  if (explained.length > 0) {
    const reasons = knownIncomplete
      .filter((known) => explained.some((result) => result.id === known.ruleId))
      .map((known) => `  - ${known.ruleId}: ${known.reason}`)
      .join("\n");
    console.log(`${label}axe reported known incomplete result(s):\n${reasons}`);
  }

  if (unexplained.length > 0) {
    console.warn(
      `${label}axe found ${unexplained.length} incomplete result(s) needing manual review ` +
        `(not treated as a failure - see docs/development/testing-playbook.md):\n\n${formatResults(unexplained)}`,
    );
  }
};
