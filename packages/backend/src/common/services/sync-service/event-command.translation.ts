import { ObjectId } from "mongodb";
import {
  CalendarIdSchema,
  type DateTime,
  DateTimeSchema,
  type EventId,
  EventIdSchema,
} from "@core/types/domain-primitives";
import { type Event, EventSchema } from "@core/types/event.contracts";
import { type EventColorSlot } from "@core/types/event-color.contracts";
import {
  type CreateEventInput,
  type DeleteEventInput,
  type RecurrenceScope,
  type ReplaceEventInput,
} from "@core/types/event-command.contracts";
import {
  type CommandSubmitRequest,
  CommandSubmitRequestSchema,
} from "@core/types/sync/command.contracts";
import {
  ClientEventIdSchema,
  type SyncEventContent,
} from "@core/types/sync/event.contracts";
import { IdempotencyKeySchema } from "@core/types/sync/identity.contracts";
import { decodeOccurrenceId } from "./occurrence-id";
import { createHash } from "node:crypto";

// Acknowledgment filler when replace omits calendarId (no move). The web is
// optimistic and discards the response body after EventResponseSchema.parse;
// we still need a contract-valid calendarId to round-trip the parse.
const UNKNOWN_CALENDAR_ID = CalendarIdSchema.parse("000000000000000000000000");

// Expand browser details-content into sync's fuller content shape. Browser
// edits never touch location/organizer/attendees/conference — pad with nulls
// so the strict SyncEventContent schema accepts the wire payload. On create
// those nulls are correct (new event). On update, sync's apply path merges
// title/description onto the existing record (mergeUpdateContent) so a rename
// cannot wipe provider-sourced attendees/location/conference. Optional color
// is forwarded when the browser sets one; omitted color leaves merge to keep
// whatever Sync already stores.
export const toSyncContent = (content: {
  title: string;
  description: string;
  color?: EventColorSlot | null;
}): SyncEventContent => ({
  title: content.title,
  description: content.description,
  location: null,
  organizer: null,
  attendees: [],
  conference: null,
  ...(content.color !== undefined ? { color: content.color } : {}),
});

export interface CommandTarget {
  eventId: EventId;
  scope: RecurrenceScope;
  recurrenceId: DateTime | null;
}

// Address a browser event id for a sync command. A composed occurrence id
// (`eventId::recurrenceId`) reverses into the series + original start; scope
// "all" drops the recurrenceId so the whole series is targeted. A plain id
// (single or series master) has no occurrence to address — coerce to scope
// "all" + null recurrenceId so sync's coherence refine accepts the request
// (the web often sends scope "this" for singles).
export const resolveCommandTarget = (
  id: string,
  scope: RecurrenceScope,
): CommandTarget => {
  const parts = decodeOccurrenceId(id);
  if (parts) {
    if (scope === "all") {
      return {
        eventId: EventIdSchema.parse(parts.eventId),
        scope: "all",
        recurrenceId: null,
      };
    }
    return {
      eventId: EventIdSchema.parse(parts.eventId),
      scope,
      recurrenceId: DateTimeSchema.parse(parts.recurrenceId),
    };
  }

  return {
    eventId: EventIdSchema.parse(id),
    scope: "all",
    recurrenceId: null,
  };
};

const hashedIdempotencyKey = (prefix: string, payload: unknown): string => {
  const digest = createHash("sha256")
    .update(JSON.stringify(payload))
    .digest("hex")
    .slice(0, 40);
  return IdempotencyKeySchema.parse(`${prefix}:${digest}`);
};

const mintEventId = (): EventId =>
  EventIdSchema.parse(new ObjectId().toHexString());

// Create → one submit request. Prefer the client-supplied id (optimistic
// create / undo-of-delete); mint an ObjectId when absent. Idempotency key is
// stable on eventId so a retried POST maps to the same command.
export const toCreateSubmitRequest = (
  input: CreateEventInput,
): { request: CommandSubmitRequest; responseEvent: Event } => {
  const eventId = input.id ?? mintEventId();
  // When the browser supplies an id (optimistic create / IndexedDB promotion),
  // preserve it as clientEventId so Sync can correlate device origin across
  // resume. Minted server ids are not client-originated — leave null.
  const clientEventId = input.id ? ClientEventIdSchema.parse(input.id) : null;
  const request = CommandSubmitRequestSchema.parse({
    idempotencyKey: IdempotencyKeySchema.parse(`create:${eventId}`),
    eventId,
    expectedVersion: null,
    input: {
      kind: "create",
      calendarId: input.calendarId,
      clientEventId,
      invitation: "none",
      content: toSyncContent(input.content),
      schedule: input.schedule,
      recurrence: input.recurrence,
    },
  });

  const now = new Date().toISOString();
  const responseEvent = EventSchema.parse({
    id: eventId,
    calendarId: input.calendarId,
    content: input.content,
    schedule: input.schedule,
    recurrence: input.recurrence,
    createdAt: now,
    updatedAt: null,
  });

  return { request, responseEvent };
};

// Replace → one update command, plus a move when calendarId is present.
// Separate idempotency keys so the two stay independently retryable. The
// response Event is synthesized from the request (web is optimistic and only
// needs EventResponseSchema to parse).
export const toReplaceSubmitRequests = (
  id: string,
  input: ReplaceEventInput,
): { requests: CommandSubmitRequest[]; responseEvent: Event } => {
  const target = resolveCommandTarget(id, input.scope);

  const updateRequest = CommandSubmitRequestSchema.parse({
    idempotencyKey: hashedIdempotencyKey("update", {
      eventId: target.eventId,
      scope: target.scope,
      recurrenceId: target.recurrenceId,
      content: input.content,
      schedule: input.schedule,
      recurrence: input.recurrence,
    }),
    eventId: target.eventId,
    expectedVersion: null,
    input: {
      kind: "update",
      invitation: "none",
      content: toSyncContent(input.content),
      schedule: input.schedule,
      recurrence: input.recurrence,
      scope: target.scope,
      recurrenceId: target.recurrenceId,
    },
  });

  const requests: CommandSubmitRequest[] = [updateRequest];

  if (input.calendarId !== undefined) {
    requests.push(
      CommandSubmitRequestSchema.parse({
        idempotencyKey: hashedIdempotencyKey("move", {
          eventId: target.eventId,
          calendarId: input.calendarId,
        }),
        eventId: target.eventId,
        expectedVersion: null,
        input: {
          kind: "move",
          calendarId: input.calendarId,
        },
      }),
    );
  }

  const responseEvent = synthesizeReplaceEvent(id, input, target);
  return { requests, responseEvent };
};

export const toDeleteSubmitRequest = (
  id: string,
  input: DeleteEventInput,
): CommandSubmitRequest => {
  const target = resolveCommandTarget(id, input.scope);
  return CommandSubmitRequestSchema.parse({
    idempotencyKey: hashedIdempotencyKey("delete", {
      eventId: target.eventId,
      scope: target.scope,
      recurrenceId: target.recurrenceId,
    }),
    eventId: target.eventId,
    expectedVersion: null,
    input: {
      kind: "delete",
      invitation: "none",
      scope: target.scope,
      recurrenceId: target.recurrenceId,
    },
  });
};

// Best-effort Event for the browser response. Cache updates are optimistic;
// this only needs to satisfy EventResponseSchema.parse on the web.
const synthesizeReplaceEvent = (
  requestId: string,
  input: ReplaceEventInput,
  target: CommandTarget,
): Event => {
  const recurrence = (() => {
    if (input.recurrence.kind === "series") {
      return { kind: "series" as const, rules: input.recurrence.rules };
    }
    if (input.recurrence.kind === "single") {
      return { kind: "single" as const };
    }
    // preserve: keep occurrence linkage when the request addressed one;
    // otherwise a plain single is the safe acknowledgment shape.
    if (target.recurrenceId !== null) {
      return { kind: "occurrence" as const, seriesId: target.eventId };
    }
    return { kind: "single" as const };
  })();

  const parts = decodeOccurrenceId(requestId);
  const responseId =
    parts && target.recurrenceId !== null ? requestId : target.eventId;

  return EventSchema.parse({
    id: responseId,
    calendarId: input.calendarId ?? UNKNOWN_CALENDAR_ID,
    content: input.content,
    schedule: input.schedule,
    recurrence,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
};
