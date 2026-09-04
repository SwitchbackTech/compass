# Provider adapter contract suite

Shared discovery checks run every registered adapter against the same bar.
Add a provider by listing `DiscoveryContractCase` entries in
`<kind>.contract.test.ts` and replaying request/response pairs through the
adapter's injectable narrow API (for Apple, the CalDAV client's `fetch`).

The full suite (auth, reader, writer, notifications, normalizer) lands in P0
WP-11 (#3236). This directory currently carries discovery cases only.

## Add Apple-style discovery coverage

```typescript
import { type DiscoveryContractCase } from "@sync/providers/__contract__/discovery.contract";

const CASES: DiscoveryContractCase[] = [
  {
    name: "detects primary",
    username: email,
    password: secret,
    run: async (adapter) => {
      const result = await adapter.discoverCalendars({ accessToken: secret });
      expect(result.cursor).toBeNull();
    },
  },
];
```

Record live fixtures with the founder account in A-11 (#3275); redact secrets
before committing.
