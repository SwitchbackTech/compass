declare module "bun:test" {
  export const jest: Record<string, unknown>;
  export const mock: {
    module(moduleName: string, factory: () => unknown): void;
  };
}
