import { renderHook } from "@testing-library/react";
import type React from "react";
import { readFile, writeFile } from "node:fs/promises";
import { beforeEach, describe, expect, it, mock, spyOn } from "bun:test";

const transpiler = new Bun.Transpiler({
  autoImportJSX: true,
  tsconfig: {
    compilerOptions: {
      jsx: "react-jsxdev",
      jsxImportSource: "react",
    },
  },
});

async function loadTempModule(
  sourceUrl: URL,
  replacements: Record<string, string> = {},
  loader: "ts" | "tsx" = "ts",
) {
  const source = await readFile(sourceUrl, "utf8");
  const transformedSource = Object.entries(replacements).reduce(
    (accumulator, [from, to]) => accumulator.replaceAll(from, to),
    source,
  );
  const tempUrl = new URL(
    `./.${sourceUrl.pathname.split("/").pop()}-${process.pid}-${Date.now()}-${Math.random()
      .toString(16)
      .slice(2)}.mjs`,
    sourceUrl,
  );
  const transformedJavaScript = transpiler.transformSync(
    transformedSource,
    loader,
  );
  await writeFile(tempUrl, transformedJavaScript);
  return tempUrl;
}

const pointerPositionUrl = await loadTempModule(
  new URL("../context/pointer-position.tsx", import.meta.url),
  {},
  "tsx",
);
const pointerPositionHookUrl = await loadTempModule(
  new URL("./usePointerPosition.ts", import.meta.url),
  {
    "@web/common/context/pointer-position": pointerPositionUrl.href,
  },
  "ts",
);

const { cursor$, PointerPositionContext, pointerState$ } = await import(
  pointerPositionUrl.href
);
const { usePointerPosition } = await import(pointerPositionHookUrl.href);

describe("usePointerPosition hooks", () => {
  beforeEach(() => {
    // Reset subjects
    pointerState$.next({
      pointerdown: false,
      selectionStart: null,
      isOverGrid: false,
      isOverSidebar: false,
      isOverMainGrid: false,
      isOverSomedayWeek: false,
      isOverSomedayMonth: false,
      isOverAllDayRow: false,
    });
    cursor$.next({ x: 0, y: 0 });
  });

  describe("usePointerPosition", () => {
    it("should throw error when used outside provider", () => {
      // Suppress console.error for the expected error
      const consoleSpy = spyOn(console, "error").mockImplementation(() => {});

      expect(() => {
        renderHook(() => usePointerPosition());
      }).toThrow(
        "usePointerPosition must be used within Provider and be defined.",
      );

      consoleSpy.mockRestore();
    });

    it("should return context value when used within provider", () => {
      const mockContext = { togglePointerMovementTracking: mock() };
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <PointerPositionContext.Provider value={mockContext}>
          {children}
        </PointerPositionContext.Provider>
      );

      const { result } = renderHook(() => usePointerPosition(), { wrapper });
      expect(result.current).toBe(mockContext);
    });
  });
});
