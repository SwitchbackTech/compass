import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const indexCss = readFileSync(join(import.meta.dir, "../../index.css"), "utf8");

const semanticColorTokens = [
  "accent-primary",
  "bg-primary",
  "bg-secondary",
  "border-primary",
  "border-primary-dark",
  "border-secondary",
  "date-picker-outside-dark",
  "date-picker-outside-light",
  "fg-primary",
  "fg-primary-dark",
  "gradient-accent-light-start",
  "gradient-accent-light-end",
  "grid-line-primary",
  "menu-bg",
  "menu-border",
  "menu-hover",
  "menu-text",
  "menu-tooltip-bg",
  "menu-tooltip-text",
  "not-found-gradient-highlight",
  "panel-badge-bg",
  "panel-bg",
  "panel-scrollbar",
  "panel-scrollbar-active",
  "panel-shadow",
  "panel-text",
  "shadow-default",
  "status-success",
  "status-error",
  "status-warning",
  "status-info",
  "tag-one",
  "tag-two",
  "tag-three",
  "text-light",
  "text-lighter",
  "text-light-inactive",
  "text-dark",
  "text-dark-placeholder",
  "text-divider",
  "text-gradient-start",
  "text-gradient-end",
] as const;

describe("Tailwind theme CSS", () => {
  it("maps every semantic color utility to a runtime theme variable", () => {
    expect(indexCss).toContain("@theme inline");

    for (const token of semanticColorTokens) {
      expect(indexCss).toMatch(
        new RegExp(
          `--color-${token}:\\s*var\\(\\s*--compass-color-${token}\\s*\\);`,
        ),
      );
    }
  });
});
