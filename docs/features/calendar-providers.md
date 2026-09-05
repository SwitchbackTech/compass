# Calendar providers (Google, Microsoft, Apple)

Locked product and architecture spec for connecting any of the three major
calendar hosts to Compass. Approved 2026-09-03. Supersedes the 2026-07-16
internal decision that deferred iCloud to an outbound ICS feed.

## Goal

A user connects Google Calendar, Outlook (Microsoft 365 or outlook.com), or
iCloud Calendar to Compass and everything works the same way: events import,
edits flow both ways, recurring series and exceptions round-trip, availability
for booking is computed from every healthy connection, conference links are
created where the host supports them, and per-connection health is honest.

## Status

Not implemented. Work is tracked across six GitHub milestones, each with a
tracking issue:

| Milestone | Purpose |
|---|---|
| Providers L: loop + CI acceleration | Agent loop generalization and CI critical-path cuts. Runs first. |
| Providers P0: foundation | Provider-plural contracts and wiring with Google unchanged. |
| Providers M: Microsoft (Outlook) | Microsoft Graph adapter set and Connect Microsoft UI. |
| Providers A: Apple (iCloud) | CalDAV adapter set, password credential, Connect iCloud UI. |
| Providers I: identity decoupling | Sign in with Microsoft and Apple; login is not calendar hosting. |
| Providers C: closeout | Cross-provider verification, docs, refresh-token encryption. |

## Locked decisions

- **Apple is a full iCloud connection over CalDAV** using an Apple app-specific
  password. There is no push from iCloud, so freshness is polling, targeted at
  one to two minutes.
- **Login and calendar hosting are separate concepts.** Microsoft and Apple
  join Google as SuperTokens login methods. Connecting a calendar is always its
  own step. Signing in with Google or Microsoft may auto-connect that calendar;
  Sign in with Apple grants no calendar access and never does.
- **Microsoft uses the `/common` endpoint** so personal and work or school
  accounts both work with one app registration. Tenants that require admin
  consent get an honest error state, not a retry loop.
- **Provider behavior enters through capabilities**, never through
  `provider === "x"` branches in domain or web code.
- **Google keeps working unchanged** through every foundation change.
- **No em-dashes** in user-facing copy.

## Capability matrix

| Capability | Google | Microsoft | Apple |
|---|---|---|---|
| Sign in as identity | yes | yes (Entra `/common`) | yes (Sign in with Apple) |
| Connect calendar | OAuth redirect | OAuth redirect | Email plus app-specific password form |
| Sign-in auto-connects the calendar | yes | yes | no; user picks the host |
| Push notifications | yes (channels) | yes (Graph subscriptions) | no; poll every 60 to 90 s |
| Incremental reads | syncToken | deltaLink | RFC 6578 sync-token |
| Conference link on create | Google Meet | Microsoft Teams when the mailbox allows it | none |
| Event colors | 11 slots plus labels | categories read as hex; no write in v1 | calendar color only |
| Attendees and invitations | yes | yes | yes, server-side scheduling |
| Contact suggestions | People API | `/me/people` | none |
| Booking destination | yes | yes | yes, without a conference link |

Capabilities are the intersection of the granted permission, the calendar's
access role, the provider's semantics, and the transport's real behavior. An
owning role never manufactures `canWatchEvents` on a transport without push.

## Architecture

The sync service (`packages/sync`) already has provider-neutral ports in
`packages/sync/src/providers/*.port.ts` (auth, calendar discovery, event
reader, event writer, notifications, contacts). Free/busy is computed locally
from stored occurrences, so no provider free/busy API is called.

Foundation work adds:

- `ProviderKindSchema` = `google | microsoft | apple` and a matching
  `CalendarProviderSchema` (`local` plus the three).
- A `ProviderRegistry` mapping a kind to its adapter set, scopes and
  capabilities. The job worker, routes and credential custody resolve adapters
  per connection instead of one adapter set per process.
- Public paths `/sync/:provider` (OAuth callback) and
  `/sync/notifications/:provider` (push ingress). The notification port gains
  `parseNotification`, which also answers Microsoft's validation handshake.
- Poll-only providers: subscription maintenance settles `unsupported` when the
  registry says `changeNotifications: false`, and a per-provider reconcile
  sweep row sets the polling cadence.
- Credentials discriminated on `credentialKind: "oauthRefresh" | "password"`.
  Password credentials are encrypted at rest with `sync.credentialEncryptionKey`.

Provider code lives under `packages/sync/src/providers/<kind>/`. Each adapter
takes an injectable narrow API interface so tests script results without
network access. A shared contract suite under
`packages/sync/src/providers/__contract__/` runs every adapter against a
recorded fixture corpus.

## Connect flows

**Google and Microsoft (redirect).** `POST /api/auth/connections/begin
{provider}` returns `{kind: "redirect", authorizationUrl}`. The browser
navigates there, the provider redirects to the sync service's
`/sync/:provider` callback, sync links the connection and enqueues calendar
list discovery, then redirects back with `?provider=<kind>&status=<status>`.

**Apple (credential form).** The user creates an app-specific password at
appleid.apple.com and submits email plus password in Compass.
`POST /api/auth/connections/credential {provider: "apple", envelope}` carries
the secret in the existing encrypted transit envelope. Sync validates it by
running CalDAV discovery, stores the encrypted credential, enqueues discovery
and returns `{kind: "connected", connectionId}`. The password is never logged.
The UI states plainly that an app-specific password grants access to the
whole iCloud account and that Compass stores it encrypted.

**Apple invitations.** iCloud performs server-side scheduling by default when
`ATTENDEE` lines are present (`SCHEDULE-AGENT=SERVER`), so adding guests makes
iCloud send mail. Compass maps `invitation: "none"` to
`SCHEDULE-AGENT=CLIENT` on attendee parameters so edits do not trigger mail.
`invitation: "all"` and `"externalOnly"` leave server scheduling enabled.

## Booking

Booking enables when any healthy connection offers a writable destination
calendar. The confirmation copy names the conference kind the destination
supports (`meet`, `teams`, `none`). An Apple destination creates the event
without a video link and says so.

## Identity

`user.identities[]` records `{provider, subjectId, email}` per login method.
The same verified email across methods resolves to one Compass user through
SuperTokens account linking. Sign in with Apple identifies by `sub`, because
private-relay addresses are not the calendar account address. After signup with
a method that grants no calendar, onboarding asks which service hosts the
calendar: "If you view your calendar in Apple Calendar, it may still be hosted
by Google or Microsoft."

## Named warts

- OAuth refresh tokens are encrypted at rest with `sync.credentialEncryptionKey` as of milestone C; legacy plaintext rows are backfilled with `encrypt-credentials` and lazily re-encrypted on refresh until the follow-up release drops plaintext acceptance.
- `GOOGLE_REVOKED` stays as an alias of `CONNECTION_REVOKED` on the SSE wire
  until every client reads the new code.
- The health snapshot reports `provider: "google"` for the whole fleet until
  milestone C splits it per provider.
- Microsoft category colors are read but never written back.
- Apple freshness depends on polling and is bounded by iCloud rate limits.

## Deferred

- Outbound ICS feed for Apple users who refuse an app-specific password.
- Writing Microsoft categories or Apple event colors.
- Publishing one Compass event to several providers.
- Native EventKit access from an iOS or macOS client.
