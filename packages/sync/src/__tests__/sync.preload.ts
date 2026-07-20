// sort-imports-ignore
// Test preload for @compass/sync. Mirrors the core preload: apply the
// bun:test → jest API compatibility shim so sync tests may use jest.fn/spyOn
// like the other packages, and pin the test environment.
import "@scripts/testing/core.jest-compat";

process.env["NODE_ENV"] = "test";
process.env["LOG_LEVEL"] = "debug";
