import { type QueryClient } from "@tanstack/react-query";
import {
  hasUserEverAuthenticated,
  markAnonymousCalendarChangeForSignUpPrompt,
} from "@web/auth/compass/state/auth.state.util";
import { isGoogleRevoked } from "@web/auth/google/state/google.auth.state";
import { session } from "@web/common/classes/Session";

export async function markAnonymousEventWrite() {
  if (await session.doesSessionExist()) return;
  if (hasUserEverAuthenticated() || isGoogleRevoked()) return;
  markAnonymousCalendarChangeForSignUpPrompt();
}

/**
 * Resolves once no create mutation for `eventId` is in flight, returning the
 * create's final status ("success" | "error"), or null when none was pending.
 *
 * Writes that can race an event's own create (editing or deleting a
 * just-created event) await this before their repository call: the id does
 * not exist server-side until the create persists, so an early write would
 * 404 — and an early "skip" would resurrect a deleted event once the create
 * lands. Callers skip their write when the create failed.
 */
export function waitForPendingEventCreate(
  queryClient: QueryClient,
  eventId: string,
): Promise<"success" | "error" | null> {
  return waitForPendingEventMutation(queryClient, eventId, ["create"]);
}

/**
 * Resolves once no delete mutation for `eventId` is in flight, returning the
 * delete's final status ("success" | "error"), or null when none was pending.
 *
 * Only undo-of-delete ever hits this (normal creates use fresh ids): the
 * restore `create` must not race its own delete, or the POST could land
 * before the DELETE server-side and the event would vanish despite the undo.
 */
export function waitForPendingEventDelete(
  queryClient: QueryClient,
  eventId: string,
): Promise<"success" | "error" | null> {
  return waitForPendingEventMutation(queryClient, eventId, [
    "delete",
    "delete-someday",
  ]);
}

function waitForPendingEventMutation(
  queryClient: QueryClient,
  eventId: string,
  operations: string[],
): Promise<"success" | "error" | null> {
  const cache = queryClient.getMutationCache();
  const pending = cache.getAll().find((mutation) => {
    if (mutation.state.status !== "pending") return false;
    const key = mutation.options.mutationKey;
    if (!Array.isArray(key) || !operations.includes(key[2] as string)) {
      return false;
    }
    return (mutation.state.variables as { _id?: string })?._id === eventId;
  });
  if (!pending) return Promise.resolve(null);

  return new Promise((resolve) => {
    const unsubscribe = cache.subscribe(() => {
      const status = pending.state.status;
      if (status === "pending") return;
      unsubscribe();
      resolve(status === "success" ? "success" : "error");
    });
  });
}
