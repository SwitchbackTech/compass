/* eslint-disable @typescript-eslint/no-namespace */
import mergeWith from "lodash.mergewith";
import { Origin, Priorities } from "@core/constants/core.constants";
import { BaseError } from "@core/errors/errors.base";
import {
  CalendarProvider,
  Event_Core,
  Schema_Event,
  Schema_Event_Recur_Base,
  Schema_Event_Recur_Instance,
  Schema_Event_Regular,
  WithCompassId,
  WithMongoId,
  WithoutCompassId,
} from "@core/types/event.types";
import { WithGcalId, gSchema$Event } from "@core/types/gcal";
import dayjs from "@core/util/date/dayjs";
import {
  isAllDay,
  isInstance,
  parseCompassEventDate,
} from "@core/util/event/event.util";
import { isCancelledGCalEvent } from "@core/util/event/gcal.event.util";
import { validateEvent } from "@core/validators/event.validator";

export namespace MapEvent {
  export const toCompass = (
    userId: string,
    events: gSchema$Event[],
    origin?: Origin,
  ): Event_Core[] => {
    const mapped = events
      .filter((event) => !isCancelledGCalEvent(event))
      .map((e: gSchema$Event) => gEventToCompassEvent(e, userId, origin));

    return mapped;
  };

  export const removeProviderData = (
    event: WithMongoId<Omit<Schema_Event, "_id">> | Schema_Event,
  ): Omit<
    WithMongoId<Omit<Schema_Event, "_id">> | Schema_Event,
    "gEventId" | "gRecurringEventId"
  > => {
    const {
      gEventId, // eslint-disable-line @typescript-eslint/no-unused-vars
      gRecurringEventId, // eslint-disable-line @typescript-eslint/no-unused-vars
      recurrence, // eslint-disable-line @typescript-eslint/no-unused-vars
      ...coreEvent
    } = event;

    if (event.recurrence?.rule) {
      Object.assign(coreEvent, { recurrence: { rule: event.recurrence.rule } });
    }

    return coreEvent;
  };

  export const removeIdentifyingData = (
    event: WithMongoId<Omit<Schema_Event, "_id">> | Schema_Event,
  ): Omit<
    Schema_Event,
    | "_id"
    | "gEventId"
    | "gRecurringEventId"
    | "order"
    | "allDayOrder"
    | "recurrence"
  > => {
    const {
      order, // eslint-disable-line @typescript-eslint/no-unused-vars
      allDayOrder, // eslint-disable-line @typescript-eslint/no-unused-vars
      recurrence, // eslint-disable-line @typescript-eslint/no-unused-vars
      ...coreEvent
    } = MapEvent.removeProviderData(event);

    return coreEvent;
  };

  export const toGcal = (
    event: Schema_Event,
    { status = "confirmed" }: Pick<gSchema$Event, "status"> = {},
  ): gSchema$Event => {
    const timeZone = dayjs.tz.guess();
    const dateKey = isAllDay(event) ? "date" : "dateTime";
    const recurrence = event.recurrence;
    const gRecurringEventId = event.gRecurringEventId;
    const hasRecurrenceRule = (recurrence?.rule ?? []).length > 0;

    const gcalEvent: gSchema$Event = {
      status,
      start: { [dateKey]: event.startDate, timeZone },
      end: { [dateKey]: event.endDate, timeZone },
      extendedProperties: {
        private: {
          // capture where event came from to later decide how to
          // sync changes between compass and integrations
          origin: event.origin || Origin.UNSURE,
          priority: event.priority || Priorities.UNASSIGNED,
        },
      },
    };

    if (event.title) gcalEvent.summary = event.title;
    if (event.description) gcalEvent.description = event.description;
    if (event.gEventId) gcalEvent.id = event.gEventId;
    if (gRecurringEventId) gcalEvent.recurringEventId = gRecurringEventId;
    if (recurrence === null) gcalEvent.recurrence = null;
    if (hasRecurrenceRule) gcalEvent.recurrence = recurrence?.rule;

    return gcalEvent;
  };

  export const toGcalInstanceProviderData = (
    instance: Omit<Schema_Event_Recur_Instance, "_id">,
    base?: Omit<Schema_Event_Recur_Base, "_id">,
  ): Pick<Schema_Event, "gEventId" | "gRecurringEventId"> => {
    const { gEventId: _gEventId } = instance;
    const { gRecurringEventId: _gRecurringEventId = base?.gEventId } = instance;
    const gRecurringEventId = _gRecurringEventId ?? instance.recurrence.eventId;
    const startDate = parseCompassEventDate(instance.startDate!);
    const isAllDayEvent = isAllDay(instance);
    const idPrefix = startDate.toRRuleDTSTARTString(isAllDayEvent);
    const gEventId = `${gRecurringEventId}_${idPrefix}`;

    return { gEventId: _gEventId ?? gEventId, gRecurringEventId };
  };

  export const toGcalSingleProviderData = (
    base:
      | WithMongoId<Omit<Schema_Event_Recur_Base | Schema_Event_Regular, "_id">>
      | WithCompassId<
          Omit<Schema_Event_Recur_Base | Schema_Event_Regular, "_id">
        >,
  ): Pick<Schema_Event, "gEventId"> => {
    const gEventId = base.gEventId ?? base._id.toString();

    return { gEventId };
  };

  export const toProviderData = (
    event:
      | WithMongoId<Omit<Schema_Event, "_id" | "recurrence">>
      | WithCompassId<Omit<Schema_Event, "_id" | "recurrence">>,
    provider?: CalendarProvider,
    base?:
      | WithMongoId<Omit<Schema_Event_Recur_Base, "_id">>
      | WithCompassId<Omit<Schema_Event_Recur_Base, "_id">>,
  ) => {
    const isCInstance = isInstance(event);

    switch (provider) {
      case CalendarProvider.GOOGLE: {
        return isCInstance
          ? MapEvent.toGcalInstanceProviderData(
              event as WithMongoId<Omit<Schema_Event_Recur_Instance, "_id">>,
              base,
            )
          : MapEvent.toGcalSingleProviderData(event);
      }
      default:
        return {};
    }
  };
}

const gEventDefaults = {
  summary: "untitled",
  description: "",
  start: {
    dateTime: "1990-01-01T00:00:00-10:00",
    timeZone: dayjs.tz.guess(),
  },
  end: {
    dateTime: "1990-01-01T00:00:00-10:00",
    timeZone: dayjs.tz.guess(),
  },
};

export const gEventToCompassEvent = (
  gEvent: gSchema$Event,
  userId: string,
  origin?: Origin,
): WithoutCompassId<Event_Core> => {
  if (!gEvent.id) {
    throw new BaseError(
      "Bad Google Event Id",
      "You got a google event without an Id, something is off",
      500,
      false,
    );
  }

  if (typeof gEvent.start === "string" && typeof gEvent.end === "string") {
    throw new BaseError(
      "Bad Google Event Date",
      "You got a google event with start `date` and `dateTime` field, something is off",
      500,
      false,
    );
  }

  const event: WithGcalId<gSchema$Event> = mergeWith(
    {},
    gEventDefaults,
    gEvent,
  );

  const { id: gEventId, description } = event;
  const title = event.summary!;
  const isAllDay = !!event.start && "date" in event.start;
  const priority = getPriority(event);
  const startDate = isAllDay ? event.start?.date : event.start?.dateTime;
  const endDate = isAllDay ? event.end?.date : event.end?.dateTime;

  const _origin =
    event.extendedProperties?.private?.["origin"] ?? origin ?? Origin.GOOGLE;

  const compassEvent: Schema_Event = {
    gEventId,
    user: userId,
    origin: _origin as Origin,
    title,
    description,
    isAllDay,
    isSomeday: false,
    startDate: startDate!,
    endDate: endDate!,
    priority,
    updatedAt: new Date(),
  };

  const recurrence = getRecurrence(event);

  // Only add recurrence if it's defined
  if (recurrence) compassEvent.recurrence = recurrence;

  const gRecurringEventId = event.recurringEventId;

  if (gRecurringEventId) compassEvent.gRecurringEventId = gRecurringEventId;

  const validatedCompassEvent = validateEvent(compassEvent);

  return validatedCompassEvent;
};

const getPriority = (gEvent: gSchema$Event): Priorities => {
  const priorityExists =
    gEvent.extendedProperties?.private?.["priority"] !== undefined &&
    gEvent.extendedProperties?.private?.["priority"] !== null;
  if (priorityExists) {
    const priority = gEvent.extendedProperties?.private?.["priority"];
    if (
      priority &&
      Object.values(Priorities).includes(priority as Priorities)
    ) {
      return priority as Priorities;
    }
    // Found a priority that doesn't match enum, set to unassigned
    console.warn(
      `Found a priority that doesn't match enum: ${priority}. Using ${Priorities.UNASSIGNED} instead. (gEvent.id: ${gEvent.id})`,
    );
    return Priorities.UNASSIGNED;
  }
  return Priorities.UNASSIGNED;
};

const getRecurrence = (gEvent: gSchema$Event) => {
  const recurrenceExists =
    gEvent.recurrence !== undefined && gEvent.recurrence !== null;
  if (recurrenceExists) {
    return {
      rule: gEvent.recurrence as string[],
    };
  }
  return undefined;
};
