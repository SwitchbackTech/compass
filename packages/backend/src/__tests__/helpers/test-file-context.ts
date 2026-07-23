import { AsyncLocalStorage } from "node:async_hooks";

const testFileUrlStorage = new AsyncLocalStorage<string>();

/** Binds the calling test file URL for per-file fixture and store isolation. */
export function enterTestFileUrl(testFileUrl: string): void {
  testFileUrlStorage.enterWith(testFileUrl);
}

export function getCurrentTestFileUrl(): string {
  const testFileUrl = testFileUrlStorage.getStore();
  if (!testFileUrl) {
    throw new Error(
      "Test file URL not set. Call setupTestDb(import.meta.url) in a beforeEach or beforeAll hook.",
    );
  }
  return testFileUrl;
}
