import { type Request, type Response } from "express";
import { type SessionRequest } from "supertokens-node/framework/express";
import { Status } from "@core/errors/status.codes";
import {
  type CreateEventInput,
  CreateEventInputSchema,
  type DeleteEventInput,
  DeleteEventInputSchema,
  type EventListQuery,
  EventListQuerySchema,
  type ReplaceEventInput,
  ReplaceEventInputSchema,
} from "@core/types/event-command.contracts";
import {
  type CommandSubmitRequest,
  type SyncCommandFailureReason,
} from "@core/types/sync/command.contracts";
import {
  type EventInstanceListQuery,
  type SyncEventCalendarId,
  SyncEventCalendarIdSchema,
} from "@core/types/sync/event.contracts";
import { assertBillingAllowsWrites } from "@backend/billing/billing.guard";
import calendarService from "@backend/calendar/services/calendar.service";
import { assertCloudMutationsAllowed } from "@backend/common/services/sync-service/cloud-mutation-mode";
import {
  toCreateSubmitRequest,
  toDeleteSubmitRequest,
  toReplaceSubmitRequests,
} from "@backend/common/services/sync-service/event-command.translation";
import { syncEventInstanceToBrowser } from "@backend/common/services/sync-service/event-list.translation";
import { toSyncPrincipal } from "@backend/common/services/sync-service/sync-principal";
import { throwSyncCommandSubmitFailure } from "@backend/common/services/sync-service/sync-proxy-error";
import { type SyncServiceClient } from "@backend/common/services/sync-service/sync-service.client";
import { getSyncServiceClient } from "@backend/common/services/sync-service/sync-service.factory";
import {
  eventMutationError,
  toEventMutationError,
} from "@backend/event/event.error";
import eventService from "@backend/event/services/event.service";

const send = (res: Response, e: unknown) => {
  const { status, body } = toEventMutationError(e);
  res.status(status).json(body);
};

const parseListQuery = (query: Request["query"]): EventListQuery => {
  const calendarIdsParam = query["calendarIds"];
  const calendarIds =
    typeof calendarIdsParam === "string" && calendarIdsParam.length > 0
      ? calendarIdsParam.split(",")
      : undefined;

  return EventListQuerySchema.parse({
    kind: "range",
    start: query["start"],
    end: query["end"],
    ...(calendarIds !== undefined ? { calendarIds } : {}),
  });
};

// Resolve every calendar the principal owns under sync delegation: provider
// calendars from sync, plus the Compass-native local calendar (local-first
// events are keyed by its legacy CalendarId). When the client passes
// `calendarIds`, intersect with owned ids so hidden calendars are never
// drained (and unowned ids cannot be probed). Empty means the user has
// nothing to read yet; return [] rather than calling sync with an invalid
// empty calendarIds. Scoped to ACTIVE calendars only: a calendar the provider
// no longer lists must never be read from (nor silently included when the
// client sends no calendarIds at all, which happens while the browser's own
// calendar list is still loading).
const resolveSyncCalendarIds = async (
  client: SyncServiceClient,
  userId: string,
  requestedIds?: readonly string[],
): Promise<SyncEventCalendarId[]> => {
  const principal = toSyncPrincipal(userId);
  const [calendarsResult, localCalendar] = await Promise.all([
    client.listCalendars(principal, { activeOnly: true }),
    calendarService.getLocalCalendar(userId),
  ]);

  if (!calendarsResult.ok) {
    throw eventMutationError(
      "PROVIDER_FAILURE",
      `Failed to list calendars from sync (${calendarsResult.error.kind})`,
    );
  }

  const ids: SyncEventCalendarId[] = [
    ...calendarsResult.value.calendars.map((c) => c.id),
  ];
  if (localCalendar) {
    ids.push(SyncEventCalendarIdSchema.parse(localCalendar._id.toHexString()));
  }

  if (requestedIds === undefined) {
    return ids;
  }

  const owned = new Set(ids);
  return requestedIds
    .filter((id) => owned.has(id as SyncEventCalendarId))
    .map((id) => SyncEventCalendarIdSchema.parse(id));
};

// Drain every page of full-fidelity instances for the range. Sync pages at
// most 500; legacy readAll was unbounded within the view window, so we follow
// nextCursor until exhausted. Horizon note: sync clamps 12mo past / 18mo
// future — the browser only views inside that window.
const listAllFullEvents = async (
  client: SyncServiceClient,
  userId: string,
  query: EventListQuery,
  calendarIds: readonly SyncEventCalendarId[],
) => {
  const principal = toSyncPrincipal(userId);
  const instances = [];
  let cursor: string | undefined;

  for (;;) {
    const pageQuery: EventInstanceListQuery = {
      calendarIds,
      start: query.start,
      end: query.end,
      ...(cursor !== undefined ? { cursor } : {}),
    };
    const result = await client.listFullEvents(principal, pageQuery);
    if (!result.ok) {
      throw eventMutationError(
        "PROVIDER_FAILURE",
        `Failed to list events from sync (${result.error.kind})`,
      );
    }
    instances.push(...result.value.instances);
    if (result.value.nextCursor === null) break;
    cursor = result.value.nextCursor;
  }

  return instances;
};

// GET /api/event when event routing delegates to sync: fetch full-fidelity
// instances from sync and translate to the browser Event contract.
// Fail-closed — a sync outage surfaces as an error rather than silently
// falling back to legacy (which would show a different, stale store).
const readAllFromSync = async (userId: string, query: EventListQuery) => {
  const client = getSyncServiceClient();
  const calendarIds = await resolveSyncCalendarIds(
    client,
    userId,
    query.calendarIds,
  );
  if (calendarIds.length === 0) return [];

  const instances = await listAllFullEvents(client, userId, query, calendarIds);
  return instances.map(syncEventInstanceToBrowser);
};

const mapSyncFailure = (reason: SyncCommandFailureReason) => {
  switch (reason) {
    case "readOnlyCalendar":
      return eventMutationError("CALENDAR_READ_ONLY", "Calendar is read-only");
    case "versionConflict":
      return eventMutationError(
        "RECURRENCE_CONFLICT",
        "Event was modified elsewhere",
      );
    case "authorizationRevoked":
      return eventMutationError(
        "GOOGLE_REVOKED",
        "Google Calendar access expired or was revoked. Reconnect Google Calendar in Compass to resume syncing.",
      );
    case "unsupportedCapability":
      // The provider declined the operation for this specific event (e.g.
      // Google rejects deleting one occurrence of a contact-linked birthday
      // event). Retrying can never succeed, so this must not share
      // PROVIDER_FAILURE's retryable 502.
      return eventMutationError(
        "UNSUPPORTED_OPERATION",
        "Google doesn't allow this change for this event (for example birthday or holiday events). Try deleting the entire series, or manage it in Google Calendar.",
      );
    case "permanentProviderError":
      return eventMutationError(
        "PROVIDER_FAILURE",
        `Sync command failed (${reason})`,
      );
  }
};

// Submit one command. Never falls back to the legacy store — a timeout or
// unavailable response may already have been accepted by sync, so retrying
// via eventService would duplicate the write.
const submitCommandOrThrow = async (
  client: SyncServiceClient,
  userId: string,
  request: CommandSubmitRequest,
) => {
  const result = await client.submitCommand(toSyncPrincipal(userId), request);
  if (!result.ok) {
    // Timeout/unavailable can mean Sync already accepted (or finished) the
    // mutation — especially provider deletes, which run inline. Do not fall
    // back to legacy; surface a retryable provider failure instead.
    throwSyncCommandSubmitFailure(result.error.kind);
  }

  const { outcome } = result.value.command;
  if (outcome.state === "failed") {
    throw mapSyncFailure(outcome.failureReason);
  }
  if (outcome.state === "cancelled") {
    throw eventMutationError("PROVIDER_FAILURE", "Sync command was cancelled");
  }
  // Backstop for invariant 1 ("every write resolves definitively"): a
  // command that is still pending/applying/reconciling has NOT actually
  // applied anywhere. Sync's stale-command retry sweep revisits
  // create/update/delete after the stale window, but this request must not
  // report success while the command is still non-terminal — the client
  // would optimistically apply the change, then a later refetch could
  // revert it with no error ever shown. Every known path that could leave a
  // command non-terminal already throws explicitly instead
  // (ProviderWriteUnavailableError, failCloud); this is the safety net for
  // any path that doesn't, today or in the future.
  if (outcome.state !== "confirmed") {
    throw eventMutationError(
      "PROVIDER_FAILURE",
      `Sync command did not resolve (${outcome.state})`,
    );
  }
  return result.value.command;
};

const createFromSync = async (userId: string, input: CreateEventInput) => {
  const client = getSyncServiceClient();
  const { request, responseEvent } = toCreateSubmitRequest(input);
  await submitCommandOrThrow(client, userId, request);
  return responseEvent;
};

const replaceFromSync = async (
  userId: string,
  eventId: string,
  input: ReplaceEventInput,
) => {
  // toReplaceSubmitRequests builds an update command, plus a move command
  // when calendarId is present — but Sync unconditionally fails every move
  // command (no executor exists). Submitting them in sequence would apply
  // the update, THEN throw on the move: a partial write the caller sees as a
  // single failed request, and a naive retry re-runs the same broken pair.
  // Reject up front, before anything is submitted.
  if (input.calendarId !== undefined) {
    throw eventMutationError(
      "MOVE_UNSUPPORTED",
      "Moving an event to a different calendar is not supported yet",
    );
  }

  const client = getSyncServiceClient();
  const { requests, responseEvent } = toReplaceSubmitRequests(eventId, input);
  for (const request of requests) {
    await submitCommandOrThrow(client, userId, request);
  }
  return responseEvent;
};

const deleteFromSync = async (
  userId: string,
  eventId: string,
  input: DeleteEventInput,
) => {
  const client = getSyncServiceClient();
  const request = toDeleteSubmitRequest(eventId, input);
  await submitCommandOrThrow(client, userId, request);
};

class EventController {
  readAll = async (req: SessionRequest, res: Response) => {
    try {
      const userId = req.session?.getUserId() as string;
      const query = parseListQuery(req.query);
      const events = await readAllFromSync(userId, query);

      res.status(Status.OK).json({ events });
    } catch (e) {
      send(res, e);
    }
  };

  create = async (req: SessionRequest, res: Response) => {
    try {
      assertCloudMutationsAllowed();
      const userId = req.session?.getUserId() as string;
      await assertBillingAllowsWrites(userId);
      const input = CreateEventInputSchema.parse(req.body);
      const event = await createFromSync(userId, input);

      res.status(Status.OK).json({ event });
    } catch (e) {
      send(res, e);
    }
  };

  replace = async (req: SessionRequest, res: Response) => {
    try {
      assertCloudMutationsAllowed();
      const userId = req.session?.getUserId() as string;
      await assertBillingAllowsWrites(userId);
      const eventId = req.params["id"] as string;
      const input = ReplaceEventInputSchema.parse(req.body);
      const event = await replaceFromSync(userId, eventId, input);

      res.status(Status.OK).json({ event });
    } catch (e) {
      send(res, e);
    }
  };

  delete = async (req: SessionRequest, res: Response) => {
    try {
      assertCloudMutationsAllowed();
      const userId = req.session?.getUserId() as string;
      await assertBillingAllowsWrites(userId);
      const eventId = req.params["id"] as string;
      const scopeParam = req.query["scope"];
      const input = DeleteEventInputSchema.parse({
        scope: typeof scopeParam === "string" ? scopeParam : "this",
      });

      await deleteFromSync(userId, eventId, input);

      res.status(Status.NO_CONTENT).send();
    } catch (e) {
      send(res, e);
    }
  };

  deleteAllByUser = async (req: SessionRequest, res: Response) => {
    try {
      const userToRemove = req.params["userId"] as string;
      const sessionUserId = req.session?.getUserId();
      // Defense in depth: even while verifyIsDev gates this route, never let
      // a session wipe another user's events.
      if (!sessionUserId || sessionUserId !== userToRemove) {
        throw eventMutationError(
          "INVALID_INPUT",
          "Cannot delete events for another user",
        );
      }
      const result = await eventService.deleteAllByUser(userToRemove);

      res.status(Status.OK).json(result);
    } catch (e) {
      send(res, e);
    }
  };
}

export default new EventController();
