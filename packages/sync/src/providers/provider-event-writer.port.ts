import { type EventSchedule } from "@core/types/event.contracts";
import { type SyncEventContent } from "@core/types/sync/event.contracts";
import { type ProviderKind } from "@core/types/sync/identity.contracts";
import { type ProviderEventRead } from "@sync/providers/provider-event.port";

// Whether the provider should notify attendees of a mutation.
export type InvitationIntent = "all" | "externalOnly" | "none";

// Recurrence to write: a standalone or single occurrence, or a series carrying
// its rules. "this and following" is not a primitive — the caller composes it
// from a series truncation plus a new create — so it is deliberately absent.
export type ProviderWriteRecurrence =
  | { readonly kind: "single" }
  | { readonly kind: "series"; readonly rules: readonly string[] };

interface ProviderWriteBody {
  readonly content: SyncEventContent;
  readonly schedule: EventSchedule;
  readonly recurrence: ProviderWriteRecurrence;
  readonly invitation: InvitationIntent;
}

export interface ProviderCreateInput extends ProviderWriteBody {
  readonly accessToken: string;
  readonly calendarId: string;
  // Caller-supplied deterministic id — makes create idempotent across retries:
  // a replay hits the same id and the provider reports it already exists.
  readonly providerEventId: string;
}

export interface ProviderPatchInput extends ProviderWriteBody {
  readonly accessToken: string;
  readonly calendarId: string;
  readonly providerEventId: string;
  // The version to condition the write on. Non-null sends an If-Match
  // precondition, so a stale caller loses to a concurrent change instead of
  // overwriting it. Null writes unconditionally (no known prior version).
  readonly expectedVersion: string | null;
}

export interface ProviderDeleteInput {
  readonly accessToken: string;
  readonly calendarId: string;
  readonly providerEventId: string;
  readonly expectedVersion: string | null;
  readonly invitation: InvitationIntent;
}

export interface ProviderFetchInput {
  readonly accessToken: string;
  readonly calendarId: string;
  readonly providerEventId: string;
}

export interface ProviderInstanceFetchInput {
  readonly accessToken: string;
  readonly calendarId: string;
  // The RECURRING master's provider id — an instance has no id of its own
  // until resolved by this call.
  readonly seriesProviderEventId: string;
  // The instance's original scheduled start (its recurrence identity) — the
  // same instant a this/thisAndFollowing scope's recurrenceId names. An
  // instance that was itself rescheduled keeps this original identity, so it
  // still resolves correctly even after being moved.
  readonly originalStartAt: string;
}

export interface ProviderWriteResult {
  readonly providerEventId: string;
  readonly providerVersion: string;
}

// A provider-neutral event mutation port. Neutral inputs in, provider identity
// out; Google request/response shapes never cross this boundary.
export interface ProviderEventWriter {
  readonly provider: ProviderKind;

  // Create at a caller-chosen id. A replay that finds the id already present
  // returns the existing identity rather than failing, so retries are safe.
  createEvent(input: ProviderCreateInput): Promise<ProviderWriteResult>;

  // Merge-patch an existing event, optionally conditioned on its version.
  patchEvent(input: ProviderPatchInput): Promise<ProviderWriteResult>;

  // Delete an event, optionally conditioned on its version. Idempotent: a
  // delete of an already-absent event resolves rather than failing.
  deleteEvent(input: ProviderDeleteInput): Promise<void>;

  // Read one event back — the reconciliation step after an ambiguous create,
  // to learn whether the write actually landed. Null when no such event exists.
  fetchEvent(input: ProviderFetchInput): Promise<ProviderEventRead | null>;

  // Resolve one occurrence of a recurring series to its own addressable
  // provider event, by the instance's original scheduled start. A this/
  // thisAndFollowing scope operates on ONE instance, which (unlike a cloud
  // series exception) has no id of its own on the provider side until
  // resolved this way; the caller then patches/deletes/fetches it with the
  // returned identity exactly like any other provider event. Null when no
  // instance exists at that instant (already cancelled, or the recurrenceId
  // does not name a real occurrence of the series).
  fetchInstanceAt(
    input: ProviderInstanceFetchInput,
  ): Promise<ProviderEventRead | null>;
}

// Why a mutation could not be applied. The terminal reasons mirror the sync
// command failure classes so a caller maps them straight to an outcome;
// `transient` is a retryable network/provider failure that is not terminal.
export type ProviderWriteErrorReason =
  | "versionConflict" // precondition failed — the caller's version is stale
  | "readOnlyCalendar" // the target calendar cannot be written
  | "authorizationRevoked" // the credential is no longer valid
  | "transient" // network / 5xx / rate limit — safe to retry
  | "permanentProviderError"; // an unrecoverable provider rejection

export class ProviderWriteError extends Error {
  constructor(
    readonly reason: ProviderWriteErrorReason,
    message: string,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = "ProviderWriteError";
  }
}
