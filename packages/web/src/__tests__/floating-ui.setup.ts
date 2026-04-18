/**
 * Mocks @floating-ui/react so components like DraggableTask run the same
 * production code paths (refs.setReference, refs.setFloating, floatingStyles)
 * in tests without requiring real layout. We call the real useFloating and
 * only override refs and floatingStyles so other components (SelectView,
 * Tooltip) still receive a valid context. Individual test files may override
 * this mock with their own mock.module("@floating-ui/react", ...).
 */
import { mock } from "bun:test";

const actual =
  require("@floating-ui/react") as typeof import("@floating-ui/react");

mock.module("@floating-ui/react", () => {
  return {
    ...actual,
    useFloating: mock((options: Parameters<typeof actual.useFloating>[0]) => {
      const result = actual.useFloating({
        ...options,
        whileElementsMounted: options?.whileElementsMounted
          ? mock(() => mock())
          : undefined,
      });
      return {
        ...result,
        refs: {
          setReference: mock(),
          setFloating: mock(),
        },
        floatingStyles: {},
      };
    }),
    autoUpdate: mock(() => mock()),
    inline: mock(() => () => {}),
    offset: mock(() => () => {}),
  };
});
