import { describe, expect, it } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const webSrc = join(import.meta.dir, "../..");

const migratedFiles = [
  "components/AbsoluteOverflowLoader/AbsoluteOverflowLoader.tsx",
  "components/LoginAbsoluteOverflowLoader/LoginAbsoluteOverflowLoader.tsx",
  "components/ContextMenu/ContextMenu.tsx",
  "components/ContextMenu/ContextMenuItems.tsx",
  "components/DatePicker/DatePicker.tsx",
  "views/NotFound/NotFound.tsx",
] as const;

const removedFiles = [
  "components/AbsoluteOverflowLoader/styled.ts",
  "components/LoginAbsoluteOverflowLoader/styled.ts",
  "components/ContextMenu/styled.ts",
  "components/DatePicker/styled.ts",
  "views/NotFound/styled.ts",
] as const;

describe("Tailwind composite component architecture", () => {
  it("keeps shared composite components independent from styled-components", () => {
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
