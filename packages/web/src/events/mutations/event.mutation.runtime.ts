import { type Mutation, type QueryClient } from "@tanstack/react-query";
import {
  hasUserEverAuthenticated,
  markAnonymousCalendarChangeForSignUpPrompt,
} from "@web/auth/compass/state/auth.state.util";
import { isGoogleRevoked } from "@web/auth/google/state/google.auth.state";
import { session } from "@web/common/classes/Session";
import { eventMutationKeys } from "./event.mutation.keys";

export async function markAnonymousEventWrite() {
  if (await session.doesSessionExist()) return;
  if (hasUserEverAuthenticated() || isGoogleRevoked()) return;
  markAnonymousCalendarChangeForSignUpPrompt();
}

type AnyMutation = Mutation<unknown, Error, unknown, unknown>;

export type PrecedingEventWrites = {
  create: "success" | "error" | null;
  delete: "success" | "error" | null;
};

// An edit/delete/convert after a failed create has nothing to write against
// (the id never existed server-side); an undo-restore create after a failed
// delete has nothing to restore (the event still exists).
export const precedingCreateOk = (preceding: PrecedingEventWrites) =>
  preceding.create !== "error";

export const precedingDeleteOk = (preceding: PrecedingEventWrites) =>
  preceding.delete !== "error";

// Reorder-someday variables are an array and carry no single id, which keeps
// them out of per-event serialization (they batch-write order fields, not
// event documents one at a time).
const variablesEventId = (mutation: AnyMutation): string | undefined => {
  const variables = mutation.state.variables as
    | { _id?: string; event?: { _id?: string } }
    | undefined;
  return variables?._id ?? variables?.event?._id;
};

const operationOf = (mutation: AnyMutation): string | undefined => {
  const key = mutation.options.mutationKey;
  if (!Array.isArray(key)) return undefined;
  const [scope, kind, operation] = key;
  const [allScope, allKind] = eventMutationKeys.all;
  if (scope !== allScope || kind !== allKind) return undefined;
  return operation as string;
};

const whenSettled = (queryClient: QueryClient, mutation: AnyMutation) =>
  new Promise<void>((resolve) => {
    const cache = queryClient.getMutationCache();
    const unsubscribe = cache.subscribe(() => {
      if (mutation.state.status === "pending") return;
      unsubscribe();
      resolve();
    });
  });

/**
 * Serializes repository writes per event: resolves once every event mutation
 * for `eventId` that was submitted before the caller has settled. Without
 * this, rapid successive changes to one event (drag bursts, undo/redo
 * replays) issue overlapping PUT/DELETE requests for the same document,
 * which the backend surfaces as Mongo write-conflict 500s.
 *
 * A mutation stays "pending" while it waits here itself, so transitively each
 * write runs only after the previous one finished — a serial queue ordered by
 * `mutationId` (assigned at `mutate()` time; the "earlier only" filter is
 * also what makes mutual waits, and thus deadlock, impossible).
 *
 * `ownVariables` must be the exact variables object the caller's mutationFn
 * received; it identifies the caller's own (already-registered) mutation in
 * the cache, so its `mutationId` can anchor the "earlier only" filter.
 *
 * Returns the final status of the latest preceding create and delete —
 * see `precedingCreateOk`/`precedingDeleteOk` for the outcome-dependent
 * skips callers apply to them.
 */
export async function waitForPrecedingEventWrites(
  queryClient: QueryClient,
  eventId: string,
  ownVariables: unknown,
): Promise<PrecedingEventWrites> {
  const mutations = queryClient
    .getMutationCache()
    .getAll()
    .sort((a, b) => a.mutationId - b.mutationId) as AnyMutation[];
  const self = mutations.find(
    (mutation) => mutation.state.variables === ownVariables,
  );
  if (!self) {
    // react-query registers a mutation (status "pending", variables set)
    // before its mutationFn runs, so the caller is always present here.
    throw new Error("waitForPrecedingEventWrites: caller not found in cache");
  }
  const preceding = mutations.filter(
    (mutation) =>
      mutation.state.status === "pending" &&
      mutation.mutationId < self.mutationId &&
      operationOf(mutation) !== undefined &&
      variablesEventId(mutation) === eventId,
  );

  await Promise.all(
    preceding.map((mutation) => whenSettled(queryClient, mutation)),
  );

  const lastStatus = (operations: string[]) => {
    const last = preceding
      .filter((mutation) => operations.includes(operationOf(mutation) ?? ""))
      .at(-1);
    if (!last) return null;
    return last.state.status === "success"
      ? ("success" as const)
      : ("error" as const);
  };

  return {
    create: lastStatus(["create"]),
    delete: lastStatus(["delete", "delete-someday"]),
  };
}
