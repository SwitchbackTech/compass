import { type CloudCommandDeps } from "@sync/domain/cloud-command.service";
import {
  isFollowingSplitAtSeriesStart,
  truncateRulesBefore,
} from "@sync/domain/occurrence-projection";
import {
  exceptionInstant,
  isCancelledException,
} from "@sync/domain/series-exception";
import { type CommandRecord } from "@sync/storage/contracts/command.contracts";

// Whether a terminal command's replay should be treated as a genuine no-op
// (the world already matches what it once confirmed) or as stale (the world
// has since diverged, so the command's target incarnation is gone and this
// submission is really a fresh intent that happens to share an identity key).
//
// The idempotency key is deliberately identity-only (eventId/scope/
// recurrenceId — see toDeleteSubmitRequest in event-command.translation.ts),
// so a delete, undo (recreate under the SAME event id — see the "A25" doc
// comment in useUndoRedo.ts), and delete-again collide on the exact same key.
// Without this check, submitCloudCommand's short-circuit at the top of the
// function returns the OLD confirmed command forever: 204 to the caller, no
// provider call, no local change, and no TTL on `commands` to ever clear it.
export async function terminalReplayIsStale(
  deps: Pick<CloudCommandDeps, "events">,
  command: CommandRecord,
): Promise<boolean> {
  // An explicit cancellation is not re-litigated by a resubmit.
  if (command.outcome.state === "cancelled") return false;
  if (command.input.kind !== "create" && command.input.kind !== "delete") {
    return false;
  }

  const existing = await deps.events.findById(
    command.tenantId,
    command.principalId,
    command.eventId,
  );

  if (command.input.kind === "create") return existing === null;

  // Absence (or a pending-deletion row) is the delete's own desired end
  // state — a genuine timeout-retry short-circuits exactly as before.
  if (!existing || existing.lifecycleState !== "active") return false;

  if (command.input.scope === "all") return true;

  // "this" / "thisAndFollowing" only apply to a series master; the contract
  // guarantees recurrenceId is set for both. Anything else is unreachable
  // from the browser today — stay conservative (not stale) rather than guess.
  if (
    command.input.recurrenceId === null ||
    existing.recurrence.kind !== "seriesMaster"
  ) {
    return false;
  }
  const recurrenceId = command.input.recurrenceId;
  const exceptions = await deps.events.findSeriesExceptions(
    command.tenantId,
    command.principalId,
    existing._id,
  );

  if (command.input.scope === "this") {
    const exception = exceptions.find(
      (candidate) => exceptionInstant(candidate) === recurrenceId,
    );
    const holds = exception !== undefined && isCancelledException(exception);
    return !holds;
  }

  // thisAndFollowing: a split at or before the series' first occurrence
  // collapses to a full-series delete (see deleteCloudSeriesFollowing) — the
  // master still existing means that never happened.
  const splitAt = new Date(recurrenceId);
  if (isFollowingSplitAtSeriesStart(existing.schedule, splitAt)) return true;
  const alreadyTruncated =
    JSON.stringify(existing.recurrence.rules) ===
    JSON.stringify(truncateRulesBefore(existing.recurrence.rules, splitAt));
  const hasFollowingException = exceptions.some(
    (candidate) =>
      new Date(exceptionInstant(candidate)).getTime() >= splitAt.getTime(),
  );
  const holds = alreadyTruncated && !hasFollowingException;
  return !holds;
}
