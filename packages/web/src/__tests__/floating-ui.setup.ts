/**
 * Mocks @floating-ui/react so components like DraggableTask run the same
 * production code paths (refs.setReference, refs.setFloating, floatingStyles)
 * in tests without requiring real layout. We call the real useFloating and
 * only override refs and floatingStyles so other components (SelectView,
 * Tooltip) still receive a valid context. Individual test files may override
 * this mock with their own jest.mock("@floating-ui/react", ...).
 */
jest.mock("@floating-ui/react", () => {
  const actual =
    jest.requireActual<typeof import("@floating-ui/react")>(
      "@floating-ui/react",
    );
  return {
    ...actual,
    useFloating: jest.fn(
      (options: Parameters<typeof actual.useFloating>[0]) => {
        const result = actual.useFloating({
          ...options,
          whileElementsMounted: options?.whileElementsMounted
            ? jest.fn(() => jest.fn())
            : undefined,
        });
        return {
          ...result,
          refs: {
            setReference: jest.fn(),
            setFloating: jest.fn(),
          },
          floatingStyles: {},
        };
      },
    ),
    autoUpdate: jest.fn(() => jest.fn()),
    inline: jest.fn(() => () => {}),
    offset: jest.fn(() => () => {}),
  };
});
