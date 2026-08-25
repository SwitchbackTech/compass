import { describe, expect, it } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";

const SKILLS_DIR = ".agents/skills";

function skillDirs(): string[] {
  return readdirSync(SKILLS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("_"))
    .map((entry) => entry.name)
    .sort();
}

describe("skill registry", () => {
  it("versions every on-disk skill and lists each in the registry", () => {
    const dirs = skillDirs();
    expect(dirs.length).toBeGreaterThan(0);
    const registry = readFileSync(`${SKILLS_DIR}/README.md`, "utf8");
    const agents = readFileSync("AGENTS.md", "utf8");
    expect(agents).toContain("`/chaos`");
    expect(agents).toContain("`/review`");

    for (const name of dirs) {
      const skill = readFileSync(`${SKILLS_DIR}/${name}/SKILL.md`, "utf8");
      expect(skill).toContain("version: 1");
      expect(skill).toContain("owner: compass-maintainers");
      expect(skill).toContain("last_verified: 2026-08-25");
      expect(skill).toContain("## When");
      expect(skill).toContain("## Steps");
      expect(skill).toContain("## Output");
      expect(skill).toContain("## Pass");
      expect(skill).toContain("## Anti-patterns");
      expect(skill).toContain("## Escalate");
      expect(registry).toContain(`| ${name} |`);
    }
  });

  it("ships eval stubs for normal, incomplete, tool-fail, and policy", () => {
    const evals = readFileSync(`${SKILLS_DIR}/_evals/README.md`, "utf8");
    expect(evals).toContain("normal.md");
    expect(evals).toContain("incomplete.md");
    expect(evals).toContain("tool-fail.md");
    expect(evals).toContain("policy.md");
    const toolFail = readFileSync(`${SKILLS_DIR}/_evals/tool-fail.md`, "utf8");
    expect(toolFail).toContain("Must not:");
    expect(toolFail).toContain("print PASS");
  });
});
