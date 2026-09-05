# Provider adapter contract suite

Shared checks that every calendar adapter must pass. Google runs against a
recorded fixture corpus under `fixtures/google/` (synthesized from the
existing adapter tests; no live account). Set `LIVE_PROVIDER=<kind>` to run
the same cases against the real API factory (L-10).

## Add a provider (under 30 lines)

```typescript
import { describeProviderContract } from "@sync/providers/__contract__/adapter-contract";
import { type ProviderAdapters } from "@sync/providers/provider-adapters";

export function microsoftRecordedFactory(corpusDir: string): ProviderAdapters {
  return replayFrom(corpusDir); // replay fixtures/microsoft/*.json
}

describeProviderContract("microsoft", microsoftRecordedFactory);
```

Record live request/response pairs with `recordingApi(realApi, corpusDir, caseName)`
(used by M-12 / A-11). Redact before committing:

- `Authorization` headers and any `*token*`, `*secret*`, `*password*` keys
- email addresses
- `Bearer …` values
- iCloud partition ids, principal hrefs, and ETags (see `redactAppleFixtureText`)

Apple runs the full adapter contract from `fixtures/apple/` via
`appleRecordedFactory`. Discovery replays PROPFIND exchanges; reader and writer
fixtures cover REPORT and PUT/DELETE contract cases. Founder refresh:
`bun run cli record-apple-contract` with `SMOKE_APPLE_EMAIL` and
`SMOKE_APPLE_APP_PASSWORD`. Nightly live runs are documented in
[`docs/CI-CD/live-provider-smoke.md`](../../../../docs/CI-CD/live-provider-smoke.md).
