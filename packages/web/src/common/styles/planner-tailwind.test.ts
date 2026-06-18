import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const webRoot = join(import.meta.dir, "../..");

describe("Planner Tailwind migration", () => {
  test.each([
    "components/PlannerSidebar/PlannerMonthPicker/PlannerMonthPicker.tsx",
    "components/PlannerSidebar/SomedayEventSections/SomedayEvents/SomedayEvent/SomedayEvent.tsx",
  ])("%s has no styled-components dependency", (file) => {
    expect(readFileSync(join(webRoot, file), "utf8")).not.toMatch(
      /styled-components|\/styled["']/,
    );
  });

  test("removes the someday event styled module", () => {
    expect(
      existsSync(
        join(
          webRoot,
          "components/PlannerSidebar/SomedayEventSections/SomedayEvents/SomedayEvent/styled.ts",
        ),
      ),
    ).toBe(false);
  });
});
