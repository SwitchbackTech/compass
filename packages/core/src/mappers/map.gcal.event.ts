import { ObjectId } from "bson";
import mergeWith from "lodash.mergewith";
import { Origin } from "@core/constants/core.constants";
import {
  BaseEventSchema,
  EditableEventFieldsSchema,
  EventMetadataSchema,
  EventSchema,
  EventStatus,
  RecurrenceRuleSchema,
  RecurrenceSchema,
  Schema_Event,
} from "@core/types/event.types";
import { gSchema$Event } from "@core/types/gcal";
import dayjs from "@core/util/date/dayjs";
import { isInstance } from "@core/util/event/event.util";
import {
  eventDatesToGcalDates,
  gCalDateToDayjsDate,
  gEventDefaults,
  isBaseGCalEvent,
  isCancelledGCalEvent,
  isInstanceGCalEvent,
  isRegularGCalEvent,
  parseExtendedProperties,
} from "@core/util/event/gcal.event.util";

export class MapGCalEvent {
  static GCalEditableSeriesFieldsSchema = EditableEventFieldsSchema.omit({
    isSomeday: true,
    order: true,
  });

  static toEvent(
    gEvent: gSchema$Event,
    overrides: Pick<Schema_Event, "calendar"> &
      Partial<Pick<Schema_Event, "_id" | "origin" | "recurrence">>,
  ): Schema_Event {
    const _event: gSchema$Event = mergeWith({}, gEventDefaults, gEvent);
    const isBase = isBaseGCalEvent(_event);
    const isInstanceEvent = isInstanceGCalEvent(_event);
    const { id, recurringEventId, originalStartTime } = _event;
    const { calendar, origin, _id = new ObjectId() } = overrides;
    const extended = parseExtendedProperties(_event, { origin });
    const startDate = gCalDateToDayjsDate(_event.start).toDate();
    const endDate = gCalDateToDayjsDate(_event.end).toDate();
    const metadata = { id };
    const rule = _event.recurrence;
    const title = _event.summary;
    const description = _event.description;
    const isSomeday = false;

    if (recurringEventId) Object.assign(metadata, { recurringEventId });

    const event: Partial<Schema_Event> = { calendar, isSomeday };

    if (isBase) Object.assign(event, { recurrence: { rule, eventId: _id } });
    if (isInstanceEvent) {
      Object.assign(event, {
        recurrence: RecurrenceSchema.parse(overrides.recurrence),
        originalStartDate: gCalDateToDayjsDate(originalStartTime).toDate(),
      });
    }

    return EventSchema.parse({
      ...event,
      title,
      description,
      startDate,
      endDate,
      metadata,
      ...extended,
      updatedAt: new Date(),
      _id,
    });
  }

  /**
   * toEvents
   *
   * maps an array of gcal events into compass events
   *
   * handles regular, base, and instance events
   * **Note** when using this method,
   * make sure that base events are included for instances to link to
   */
  static toEvents(
    calendar: ObjectId,
    events: gSchema$Event[],
    origin?: Origin,
  ): Array<Schema_Event> {
    const { toEvent } = MapGCalEvent;
    const active = events.filter((event) => !isCancelledGCalEvent(event));
    const _regular = active.filter(isRegularGCalEvent);
    const _instance = active.filter(isInstanceGCalEvent);
    const _base = active.filter(isBaseGCalEvent);

    const regular = _regular.map((e) => toEvent(e, { calendar, origin }));
    const base = _base.map((e) => toEvent(e, { calendar, origin }));

    const instance = _instance.map((e) => {
      const baseEvent = BaseEventSchema.parse(
        base.find(({ metadata }) => metadata?.id === e.recurringEventId),
        { error: () => "Base event not found for instance" },
      );

      return toEvent(e, {
        _id: new ObjectId(),
        calendar,
        origin,
        recurrence: {
          rule: baseEvent.recurrence?.rule,
          eventId: baseEvent._id,
        },
      });
    });

    // ordering deliberately kept: regular, base, instance
    return [...regular, ...base, ...instance];
  }

  static fromEvent<GEvent extends gSchema$Event = gSchema$Event>(
    event: Schema_Event,
    _overrides: Partial<
      Omit<
        gSchema$Event,
        | "id"
        | "recurringEventId"
        | "summary"
        | "description"
        | "start"
        | "end"
        | "originalStartTime"
        | "recurrence"
        | "extendedProperties"
      >
    > = {},
  ): Pick<
    GEvent,
    | "id"
    | "recurringEventId"
    | "status"
    | "summary"
    | "description"
    | "start"
    | "end"
    | "originalStartTime"
    | "recurrence"
    | "extendedProperties"
  > {
    const _rule = RecurrenceRuleSchema.safeParse(event.recurrence?.rule);
    const overrides = { ..._overrides } as gSchema$Event;
    const { success: hasRecurrenceRule, data: rule } = _rule;
    const startDate = dayjs(event.startDate);
    const dates = eventDatesToGcalDates(event);
    const { metadata } = event;
    const noMetadata = !("metadata" in event);
    const isInstanceEvent = isInstance(event);

    delete overrides.id;
    delete overrides.recurringEventId;
    delete overrides.summary;
    delete overrides.description;
    delete overrides.start;
    delete overrides.end;
    delete overrides.originalStartTime;
    delete overrides.recurrence;
    delete overrides.extendedProperties;

    const gcalEvent: gSchema$Event = {
      ...overrides,
      status: overrides.status ?? EventStatus.CONFIRMED,
      summary: event.title,
      description: event.description,
      ...dates,
      ...metadata,
      extendedProperties: {
        private: {
          // capture where event came from to later decide how to
          // sync changes between compass and integrations
          origin: event.origin,
          priority: event.priority,
        },
      },
    };

    if (event.recurrence === null) gcalEvent.recurrence = null;
    if (!isInstanceEvent && hasRecurrenceRule) gcalEvent.recurrence = rule;
    if (noMetadata) gcalEvent.id = event._id.toString();

    if (
      noMetadata &&
      isInstanceEvent &&
      event.recurrence &&
      "eventId" in event.recurrence
    ) {
      const isAllDay = dates.start && "date" in dates.start;
      const recurringEventId = event.recurrence.eventId.toString();
      const id = `${recurringEventId}_${startDate.toRRuleDTSTARTString(isAllDay)}`;
      gcalEvent.id = id;
      gcalEvent.recurringEventId = recurringEventId;
    }

    // ensure ids
    const ids = EventMetadataSchema.parse(gcalEvent);

    return { ...gcalEvent, ...ids } as GEvent;
  }
}
