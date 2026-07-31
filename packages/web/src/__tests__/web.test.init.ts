process.env.API_BASEURL = "http://localhost:3000/api";
process.env.GOOGLE_CLIENT_ID = "mockedClientId";
// Distinct from NODE_ENV=test, which the e2e webServer also sets (see
// routers/loaders.ts) — this marks specifically a `bun test` process, so
// posthog-react.ts can skip loading the real SDK only here.
process.env.BUN_TEST_RUN = "true";
