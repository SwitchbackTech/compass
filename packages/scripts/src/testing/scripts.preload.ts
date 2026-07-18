// Bun preload for the scripts test suite. Scripts tests exercise migrations
// against the same backend services and node-module mocks the backend tests
// use, so the setup is identical -- reuse the backend preload verbatim.
import "@backend/__tests__/backend.preload";
