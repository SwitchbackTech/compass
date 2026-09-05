# Microsoft Graph fixture corpus

Recorded and synthesized Graph request/response shapes for the shared adapter
contract suite (`microsoft.contract.test.ts`). No live account is required to
run `bun test:sync`.

## Files

| File | Contract coverage |
|---|---|
| `exchange-success.json` | OAuth code exchange and id-token claims |
| `refresh-success.json` | Refresh token mints a new access token |
| `refresh-invalid-grant.json` | Revoked refresh maps to `authorizationRevoked` |
| `normalizer.json` | Timed, all-day, series, exception, cancelled, occurrence skip, attendees, Teams link, category color |
| `reader.json` | Delta paging, expired cursor, master/exception rows, skipped occurrence |
| `writer.json` | Create, patch conflict, delete idempotency, instance fetch, `teamsForBusiness` meeting settings |
| `notifications.json` | Subscription watch, change parse, validation handshake, lifecycle hint |

## Account variants

The writer corpus uses **`teamsForBusiness`** meeting settings (work or school
mailbox). Personal outlook.com accounts expose **`teamsForConsumer`** instead;
selection logic is covered in `microsoft-meeting-providers.test.ts`. Re-record
`writer.json` with `meetingSettings.allowedOnlineMeetingProviders` set to
`["teamsForConsumer"]` if the smoke account is personal-only.

## Redactions

Before commit, every fixture was passed through `redactValue` from
`recording-api.ts` (or hand-edited to the same rules):

- **`Authorization` headers** and any `*token*`, `*secret*`, `*password*` keys → `[REDACTED]`
- **Email addresses** → `[email]` (fixture emails use `@example.com`, `@x.com`, or `@contoso.com` placeholders)
- **Bearer tokens** → `Bearer [REDACTED]`
- **Graph ids** (event, calendar, subscription) → stable `AAMk…` / `sub-1` placeholders unrelated to production
- **Teams join URLs** → `https://teams.microsoft.com/l/meetup-join/abc`
- **Real refresh tokens** → `microsoft-refresh-token`, `fresh-access-token`, etc.

Live smoke uses `SMOKE_MICROSOFT_REFRESH_TOKEN` in the GitHub `provider-smoke`
Environment only; it is never stored in this repo.
