declare module "bun:test" {
  type TestHandler = () => void | Promise<void>;

  type Matchers = {
    toBe(expected: unknown): void;
    toBeDefined(): void;
    toEqual(expected: unknown): void;
    toHaveLength(expected: number): void;
  };

  export function beforeEach(fn: TestHandler): void;
  export function describe(name: string, fn: TestHandler): void;
  export function expect(actual: unknown): Matchers;
  export function it(name: string, fn: TestHandler): void;

  export const jest: Record<string, unknown>;
  export const mock: {
    module(moduleName: string, factory: () => unknown): void;
  };
}
