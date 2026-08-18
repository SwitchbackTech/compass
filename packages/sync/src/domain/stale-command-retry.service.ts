import { type SyncCommandInput } from "@core/types/sync/command.contracts";
import {
  type CloudCommandDeps,
  ProviderWriteUnavailableError,
  retryCloudMutation,
} from "@sync/domain/cloud-command.service";
import { type CommandRepository } from "@sync/storage/repositories/command.repository";

export interface StaleCommandRetryDeps extends CloudCommandDeps {
  commands: CommandRepository;
  // Called once per command that threw something other than
  // ProviderWriteUnavailableError. The sweep keeps going; the caller decides
  // how loud to be.
  onRetryError?: (error: unknown, commandId: string) => void;
}

export interface StaleCommandRetryResult {
  // How many stale commands this sweep gave a fresh attempt.
  attempted: number;
  // Of those, how many are STILL nonterminal after the attempt - either the
  // same transient failure recurred, or the provider write is unavailable.
  stillStale: number;
}

// The kinds executed inline and synchronously from the command HTTP request
// (see cloud-command.service.ts's applyCloudMutation / create path): a
// transient provider failure mid-execute there returns the command unchanged,
// and no job worker revisits it. Without this sweep, an event can sit visibly
// "creating"/"deleting" or reflecting a half-applied update forever after one
// blip.
const RETRYABLE_KINDS: readonly SyncCommandInput["kind"][] = [
  "create",
  "update",
  "delete",
];

// The self-heal sweep for commands stuck nonterminal (pending/applying/
// reconciling) past the stale window. Re-runs the exact same routing logic
// the original request used (retryCloudMutation -> applyCloudMutation /
// create path), so a command that recovers converges exactly as it would
// have inline.
// retryCloudMutation itself refuses to reapply a command superseded by a
// later one for the same event (failing it as versionConflict instead) - a
// stale command that just sat pending for the retry window is not
// necessarily still the latest intent, and reapplying old content over a
// newer edit would be silent data loss. A GLOBAL scan across owners (system
// liveness, not a user request) - mirrors failed-job-requeue.service.ts's
// sweep shape.
//
// Each command is retried independently: one that throws something
// unexpected is reported and skipped, never allowed to abandon the rest of
// the batch. listStaleNonterminal sorts oldest-updatedAt-first, so a single
// doomed command would otherwise sort to the front and block this sweep for
// EVERY tenant on every cycle, forever - the same class of failure
// enqueueForResources was hardened against (2026-07-31: one unparseable job
// doc froze calendar sync fleet-wide for 23h).
export async function retryStaleCommands(
  deps: StaleCommandRetryDeps,
  before: Date,
  now: () => Date,
  limit = 50,
): Promise<StaleCommandRetryResult> {
  const stale = await deps.commands.listStaleNonterminal(
    before,
    RETRYABLE_KINDS,
    limit,
  );

  const NONTERMINAL_STATES = new Set(["pending", "applying", "reconciling"]);
  let stillStale = 0;
  for (const command of stale) {
    try {
      const result = await retryCloudMutation(deps, command, now);
      if (NONTERMINAL_STATES.has(result.outcome.state)) {
        stillStale++;
      }
    } catch (error) {
      // Provider work went unavailable between the sweep starting and this
      // command's turn (e.g. execution flipped mid-cycle) - leave it for the
      // next sweep rather than losing the rest of the batch to one throw.
      if (error instanceof ProviderWriteUnavailableError) {
        stillStale++;
        continue;
      }
      // Anything else is unexpected (a malformed row, a bug) - report it and
      // move on rather than losing every command behind this one, forever.
      deps.onRetryError?.(error, command._id);
      stillStale++;
    }
  }

  return { attempted: stale.length, stillStale };
}
