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

Apple discovery-only cases stay in `apple.contract.test.ts` until the rest of
the Apple adapter set lands (A-11). Nightly live runs are documented in
[`docs/CI-CD/live-provider-smoke.md`](../../../../docs/CI-CD/live-provider-smoke.md).
