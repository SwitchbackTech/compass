# Attendee support — context, decisions, invariants

Read once before your first WP. Skip if your WP is already unambiguous.

## Where the codebase is today

Attendees are fully modeled and **read-only end-to-end by explicit
design**:

- Model:
  [`packages/core/src/types/event-attendance.contracts.ts`](../../packages/core/src/types/event-attendance.contracts.ts)
  — `AttendeeSchema` {email, displayName, responseStatus},
  `OrganizerSchema`, `ConferenceSchema`.
- Read path already works: gcal → `google-event.normalizer.ts`
  (`mapAttendees`) → sync store → `event-instance-assembly.ts` → backend
  `event-list.translation.ts` → web `event.view-model.ts` →
  [`EventDetailsSection.tsx`](../../packages/web/src/views/Forms/EventForm/EventDetailsSection.tsx)
  (read-only guest list with RSVP dots). Incoming RSVP changes from other
  attendees already flow in via incremental sync + SSE `eventsChanged`.
- The write path drops attendees in four defended places:
  1. [`packages/core/src/types/event-command.contracts.ts`](../../packages/core/src/types/event-command.contracts.ts)
     — `EditableContentSchema` (strictObject) excludes attendees.
  2. [`packages/backend/src/common/services/sync-service/event-command.translation.ts`](../../packages/backend/src/common/services/sync-service/event-command.translation.ts)
     — `toSyncContent` hardcodes `organizer: null, attendees: [],
     conference: null`; `invitation: "none"` hardcoded at three call
     sites.
  3. [`packages/sync/src/domain/merge-update-content.ts`](../../packages/sync/src/domain/merge-update-content.ts)
     — merges only title/description/location/color, so an edit cannot
     wipe provider attendees.
  4. [`packages/sync/src/providers/google/google-event-writer.adapter.ts`](../../packages/sync/src/providers/google/google-event-writer.adapter.ts)
     — `toGoogleBody` deliberately omits attendees (see the comment at
     ~line 300); `toSendUpdates` maps `InvitationIntent` 1:1 to Google
     `sendUpdates`.
- Sync's command inputs already carry
  `invitation: InvitationIntentSchema` (`all | externalOnly | none`,
  default none) end-to-end
  ([`packages/core/src/types/sync/command.contracts.ts`](../../packages/core/src/types/sync/command.contracts.ts));
  only the backend hardcodes `"none"`. **Google sends invitation emails
  itself when `sendUpdates != none` — Compass needs no email infra.**
- OAuth scopes live in FOUR lists that must stay in sync:
  [`packages/backend/src/auth/services/google/google.auth.scopes.ts`](../../packages/backend/src/auth/services/google/google.auth.scopes.ts),
  [`packages/sync/src/providers/google/google.scopes.ts`](../../packages/sync/src/providers/google/google.scopes.ts),
  [`packages/web/src/auth/google/authorization/google-authorization.constants.ts`](../../packages/web/src/auth/google/authorization/google-authorization.constants.ts)
  (client-side REQUIRED verification — sign-in fails if any is missing),
  and [`e2e/oauth/google-auth-callback.spec.ts`](../../e2e/oauth/google-auth-callback.spec.ts).
- Sync's connect flow already does incremental auth:
  `buildAuthorizationUrl` sets `include_granted_scopes: true`; granted
  scopes persist per connection (`ProviderConnection.grantedScopes`) and
  [`google-capabilities.ts`](../../packages/sync/src/providers/google/google-capabilities.ts)
  derives capabilities from them (an `inviteAttendees` capability already
  exists). Connection state has an `insufficientScopes` value.
- **No People API / contacts code exists anywhere.**

## Invariants that must survive every WP

1. [`packages/sync/src/safety/safety-canary.ts`](../../packages/sync/src/safety/safety-canary.ts):
   attendee JSON is a forbidden log pattern. No attendee or contact data
   in sync logs, SSE payloads, or error causes. Sync WPs state
   "safety-canary tests pass" in Evidence.
2. Busy projections never carry attendee content
   ([`packages/core/src/types/sync/busy.contracts.test.ts`](../../packages/core/src/types/sync/busy.contracts.test.ts)).
3. RSVP drift must not block command replay: `matchesIntendedEdit`
   ([`provider-command.service.ts`](../../packages/sync/src/domain/provider-command.service.ts))
   keeps ignoring `responseStatus`; with `attendeesEdit: "replace"` it
   compares email sets only (WP-02).
4. Legacy payloads keep parsing: every contract change is additive with
   defaults (`attendeesEdit` defaults `"preserve"`; browser `attendees`
   and `invitation` are optional).
5. `GOOGLE_AUTH_SCOPES_REQUIRED` (web) and the backend's required-scope
   validation never gain a contacts scope — contacts are optional.
6. No barrel files; alias imports; Zod contracts for shared shapes in
   `packages/core`; RTL semantic queries; Tailwind semantic colors (see
   [`AGENTS.md`](../../AGENTS.md)).

## Product decisions (approved 2026-08-25 — do not re-litigate)

1. **Contacts = optional incremental grant, both scopes**
   (`contacts.readonly` + `contacts.other.readonly`). Requested on the
   onboarding consent screen but never required; users who leave them
   unchecked proceed. An occasional, non-nagging nudge in the attendee
   field offers to enable contacts via the connect flow's incremental
   re-consent.
2. **Invitation emails: save-time prompt.** When the guest set changed,
   ask "Send invitation emails?" defaulting to Send
   (`sendUpdates: "all"`); "Don't send" maps to `"none"`. No prompt when
   guests are untouched.
3. **Full RSVP including per-occurrence.** Accepted / declined /
   tentative from Compass, targetable at one occurrence ("this event",
   via the composite `eventId::recurrenceId` occurrence id) or the whole
   series ("all events"), reusing the RecurrenceScopeDialog pattern.
4. **Non-organizer guest-list editing is rejected in v1** with a typed
   `unsupportedCapability`; invited users get the RSVP control only.
   `guestsCanModify` support is a documented follow-up.

## Architecture decisions baked into the WPs

- **Attendee input contract**: new `AttendeeInputSchema` {email,
  displayName nullable} — no `responseStatus`. Browser
  `EditableContentSchema` gains optional `attendees`; omitted = "not
  editing guests" (today's behavior), present (including `[]`) =
  "replace membership with this set".
- **Sync command intent**: create/update command inputs gain
  `attendeesEdit: z.enum(["replace", "preserve"]).default("preserve")`.
  Stored `SyncEventContentSchema` is unchanged. The default is the
  backward-compat guarantee: every existing caller and stored command
  stays valid and byte-identical in behavior.
- **Merge-by-email in sync, against freshly fetched provider state**:
  retained emails keep the provider's current responseStatus and
  displayName; new emails enter as `needsAction`; dropped emails are
  removed. Google patch replaces the whole `attendees` array, so the
  merge input must be `current.content`, not sync's stored record —
  otherwise a concurrent RSVP between syncs gets clobbered.
- **RSVP is a new command kind**, not an overloaded update:
  `{kind: "rsvp", responseStatus, ...}` in `SyncCommandInputSchema`.
  Execution: fetch current provider state, rewrite only the self
  attendee entry (matched by the connection's account email,
  case-insensitive), patch the merged list with `sendUpdates: "none"`.
  Replay check: current self status equals intended. Per-occurrence RSVP
  targets the occurrence event via the existing occurrence-id decode.
- **People API code lives in sync** (sync owns all Google code):
  `google-people.adapter.ts` behind a narrow `ContactsPort`; sync route
  `/internal/contacts/suggestions` (principal-scoped); backend proxy
  `GET /api/contacts/suggestions?q=` mirroring the existing
  `sync-service.client.ts` proxy pattern. The grant lives where grants
  already live: per-connection `grantedScopes` → new `suggestContacts`
  capability → surfaced to the browser on `GoogleSyncConnectionSummary`.
- **Etag discipline unchanged**: `expectedVersion` stays as-is; no
  If-Match retry loops. The fetch→patch race window is a named wart
  documented in WP-09.

## Named warts (documented, accepted for v1)

- Fetch→patch race: a provider-side change between sync's fetch and
  patch can be overwritten within that window.
- Alias-email self-match: RSVP matches the self attendee by the
  connection's account email; Google aliases may not match.
- Google auto-adds the organizer as an accepted attendee on create, so
  post-create readback can differ from the intended set (normalizer
  handles it; never compare create bodies to readback).
