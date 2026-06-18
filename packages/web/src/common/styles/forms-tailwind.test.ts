import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const formsRoot = join(import.meta.dir, "../../views/Forms");

const productionFiles = [
  "ActionsMenu/ActionsMenu.tsx",
  "ActionsMenu/MenuItem.tsx",
  "EventForm/EventForm.tsx",
  "EventForm/MoveToSidebarMenuButton.tsx",
  "EventForm/SaveSection/SaveSection.tsx",
  "EventForm/PrioritySection/PrioritySection.tsx",
  "EventForm/DateControlsSection/DateControlsSection/DateControlsSection.tsx",
  "EventForm/DateControlsSection/DateTimeSection/DateTimeSection.tsx",
  "EventForm/DateControlsSection/DateTimeSection/DatePickers/DatePickers.tsx",
  "EventForm/DateControlsSection/DateTimeSection/TimePicker/TimePicker.tsx",
  "EventForm/DateControlsSection/DateTimeSection/TimePicker/TimePickers.tsx",
  "EventForm/DateControlsSection/RecurrenceSection/RecurrenceSection.tsx",
  "SomedayEventForm/SomedayEventForm.tsx",
  "SomedayEventForm/SomedayRecurrenceSection/SomedayRecurrenceSection.tsx",
  "SomedayEventForm/SomedayRecurrenceSection/SomedayRecurrenceSelect/SomedayRecurrenceSelect.tsx",
];

const removedStyleModules = [
  "ActionsMenu/styled.ts",
  "EventForm/styled.ts",
  "EventForm/PrioritySection/styled.ts",
  "EventForm/DateControlsSection/DateControlsSection/styled.ts",
  "EventForm/DateControlsSection/DateTimeSection/styled.ts",
  "EventForm/DateControlsSection/DateTimeSection/DatePickers/styled.ts",
  "EventForm/DateControlsSection/DateTimeSection/TimePicker/styled.ts",
  "EventForm/DateControlsSection/RecurrenceSection/styled.ts",
  "SomedayEventForm/styled.ts",
  "SomedayEventForm/SomedayRecurrenceSection/SomedayRecurrenceSelect/styled.ts",
];

describe("forms Tailwind migration", () => {
  test.each(
    productionFiles,
  )("%s has no styled-components dependency", (file) => {
    expect(readFileSync(join(formsRoot, file), "utf8")).not.toMatch(
      /styled-components|\/styled["']/,
    );
  });

  test.each(removedStyleModules)("removes %s", (file) => {
    expect(existsSync(join(formsRoot, file))).toBe(false);
  });
});
