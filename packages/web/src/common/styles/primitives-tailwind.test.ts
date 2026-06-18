import { describe, expect, it } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const webSrc = join(import.meta.dir, "../..");

const migratedFiles = [
  "components/Flex/Flex.tsx",
  "components/Text/Text.tsx",
  "components/Input/Input.tsx",
  "components/Textarea/Textarea.tsx",
  "components/IconButton/IconButton.tsx",
  "components/Divider/Divider.tsx",
  "components/Focusable/Focusable.tsx",
  "components/Button/Button.tsx",
  "components/Icons/Calendar.tsx",
  "components/Icons/CircleTwo.tsx",
  "components/Icons/Command.tsx",
  "components/Icons/Flask.tsx",
  "components/Icons/List.tsx",
  "components/Icons/Refresh.tsx",
  "components/Icons/Repeat.tsx",
  "components/Icons/Sidebar.tsx",
  "components/Icons/Spinner.tsx",
  "components/Icons/Todo.tsx",
  "components/Icons/X.tsx",
] as const;

const removedFiles = [
  "components/Flex/index.ts",
  "components/Flex/styled.ts",
  "components/Text/index.ts",
  "components/Text/styled.ts",
  "components/Input/styled.ts",
  "components/Textarea/styled.ts",
  "components/Textarea/index.ts",
  "components/IconButton/styled.ts",
  "components/Divider/styled.ts",
  "components/Divider/index.ts",
  "components/Button/styled.ts",
  "components/Icons/styled.ts",
  "common/styles/animations/rotate.ts",
] as const;

describe("Tailwind primitive architecture", () => {
  it("keeps shared primitives independent from styled-components", () => {
    for (const file of migratedFiles) {
      const path = join(webSrc, file);

      expect(existsSync(path), `${file} should exist`).toBe(true);
      expect(readFileSync(path, "utf8"), file).not.toContain(
        "styled-components",
      );
    }

    for (const file of removedFiles) {
      expect(existsSync(join(webSrc, file)), `${file} should be removed`).toBe(
        false,
      );
    }
  });
});
