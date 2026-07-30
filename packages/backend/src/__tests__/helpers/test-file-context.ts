import { afterAll } from "bun:test";

const UNIT_TEST_ISOLATION_KEY = "__unit__";

// Per-worker module state: Bun's parallel pool runs one test file per worker at
// a time, so a single active URL is enough (AsyncLocalStorage enterWith does
// not reliably propagate into async test bodies on Bun 1.3.x).
let activeTestFileUrl: string | undefined;

/** Binds the calling test file URL for per-file fixture and store isolation. */
export function enterTestFileUrl(testFileUrl: string): void {
  activeTestFileUrl = testFileUrl;
}

/** Clears the active test file URL when a test file finishes on this worker. */
export function leaveTestFileUrl(): void {
  activeTestFileUrl = undefined;
}

afterAll(leaveTestFileUrl);

/** Per-file key when setupTestDb ran; shared key for lightweight unit tests. */
export function getTestIsolationKey(): string {
  return activeTestFileUrl ?? UNIT_TEST_ISOLATION_KEY;
}
