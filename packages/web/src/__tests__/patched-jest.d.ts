import type { jest as JestNamespace } from "bun:test";
import type { TestingLibraryMatchers } from "@types/testing-library__jest-dom/matchers";

export declare const jest: typeof JestNamespace;

declare module "bun:test" {
  interface Matchers<T = unknown>
    extends TestingLibraryMatchers<unknown, void> {}
}
