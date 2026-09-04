import { describe, expect, it } from "bun:test";
import { existsSync, readdirSync, readFileSync } from "node:fs";

const SKILLS_DIR = ".agents/skills";

function skillDirs(): string[] {
  return readdirSync(SKILLS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

describe("skill registry", () => {
  it("versions every on-disk skill and lists each in the registry", () => {
    const dirs = skillDirs();
    expect(dirs.length).toBeGreaterThan(0);
    const registry = readFileSync(`${SKILLS_DIR}/README.md`, "utf8");

    for (const name of dirs) {
      const skill = readFileSync(`${SKILLS_DIR}/${name}/SKILL.md`, "utf8");
      expect(skill).toMatch(/^version: \d+$/m);
      expect(skill).toContain("owner: compass-maintainers");
      expect(skill).toMatch(/^last_verified: \d{4}-\d{2}-\d{2}$/m);
      expect(registry).toContain(`| ${name} |`);
    }
  });

  it("keeps the shared anti-patterns file next to the skills", () => {
    expect(existsSync(`${SKILLS_DIR}/anti-patterns.md`)).toBe(true);
  });
});
