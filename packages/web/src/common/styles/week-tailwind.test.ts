import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const webRoot = join(import.meta.dir, "../..");
const productionFiles = [
  "views/Week/WeekView.tsx",
  "views/Week/components/Grid/WeekGridScrollArea.tsx",
  "views/Week/components/Grid/AllDayRow/AllDayEvents.tsx",
  "views/Week/components/Grid/AllDayRow/AllDayRow.tsx",
  "views/Week/components/Header/DayLabels.tsx",
  "views/Week/components/Header/Reminder/Reminder.tsx",
  "views/Week/components/Grid/MainGrid/EdgeNavigationIndicators/EdgeNavigationIndicators.tsx",
];
const styledModules = [
  "views/Week/styled.tsx",
  "views/Week/components/Grid/Columns/styled.ts",
  "views/Week/components/Grid/AllDayRow/styled.ts",
  "views/Week/components/Header/Reminder/styled.ts",
  "views/Week/components/Grid/MainGrid/EdgeNavigationIndicators/styled.ts",
];

describe("Week Tailwind migration", () => {
  test.each(
    productionFiles,
  )("%s has no styled-components dependency", (file) => {
    expect(readFileSync(join(webRoot, file), "utf8")).not.toMatch(
      /styled-components|\/styled["']/,
    );
  });

  test.each(styledModules)("removes %s", (file) => {
    expect(existsSync(join(webRoot, file))).toBe(false);
  });
});
