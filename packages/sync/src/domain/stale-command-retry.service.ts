import { type SyncCommandInput } from "@core/types/sync/command.contracts";
import {
  type CloudCommandDeps,
  ProviderWriteUnavailableError,
  retryCloudMutation,
} from "@sync/domain/cloud-command.service";
import { type CommandRepository } from "@sync/storage/repositories/command.repository";

export interface StaleCommandRetryDeps extends CloudCommandDeps {
  commands: CommandRepository;
}

export interface StaleCommandRetryResult {
  // How many stale commands this sweep gave a fresh attempt.
  attempted: number;
  // Of those, how many are STILL nonterminal after the attempt - either the
  // same transient failure recurred, or the provider write is unavailable.
  stillStale: number;
}

// The kinds executed inline and synchronously from the command HTTP request
// (see cloud-command.service.ts's applyCloudMutation): a transient provider
// failure mid-execute there returns the command unchanged, and no job or
// worker ever revisits it. Without this sweep, an event can sit visibly
// "deleting" or reflecting a half-applied update forever after one blip.
const RETRYABLE_KINDS: readonly SyncCommandInput["kind"][] = [
  "update",
  "delete",
];

// The self-heal sweep for commands stuck nonterminal (pending/applying/
// reconciling) past the stale window. Re-runs the exact same routing logic
// the original request used (retryCloudMutation -> applyCloudMutation), so a
// command that recovers converges exactly as it would have inline. A GLOBAL
// scan across owners (system liveness, not a user request) - mirrors
// failed-job-requeue.service.ts's sweep shape.
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
      throw error;
    }
  }

  return { attempted: stale.length, stillStale };
}
