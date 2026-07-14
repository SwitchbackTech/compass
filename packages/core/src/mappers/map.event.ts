/* eslint-disable @typescript-eslint/no-namespace */

import mergeWith from "lodash.mergewith";
import { Origin } from "@core/constants/core.constants";
import { BaseError } from "@core/errors/errors.base";
import { CalendarProvider } from "@core/types/calendar.types";
import { type gSchema$Event, type WithGcalId } from "@core/types/gcal";
import {
  type BaseEvent,
  type InstanceEvent,
  type LegacyEvent,
  type StandaloneEvent,
  type ValidatedLegacyEvent,
} from "@core/types/legacy-event.contracts";
import {
  type WithId,
  type WithObjectId,
  type WithoutId,
} from "@core/types/type.utils";
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
  ): ValidatedLegacyEvent[] => {
    const mapped = events
      .filter((event) => !isCancelledGCalEvent(event))
      .map((e: gSchema$Event) => gEventToCompassEvent(e, userId, origin));

    return mapped;
  };

  export const removeProviderData = (
    event: WithObjectId<Omit<LegacyEvent, "_id">> | LegacyEvent,
  ): Omit<
    WithObjectId<Omit<LegacyEvent, "_id">> | LegacyEvent,
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
    event: WithObjectId<Omit<LegacyEvent, "_id">> | LegacyEvent,
  ): Omit<
    LegacyEvent,
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
    event: LegacyEvent,
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
    instance: Omit<InstanceEvent, "_id">,
    base?: Omit<BaseEvent, "_id">,
  ): Pick<LegacyEvent, "gEventId" | "gRecurringEventId"> => {
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
      | WithObjectId<Omit<BaseEvent | StandaloneEvent, "_id">>
      | WithId<Omit<BaseEvent | StandaloneEvent, "_id">>,
  ): Pick<LegacyEvent, "gEventId"> => {
    const gEventId = base.gEventId ?? base._id.toString();

    return { gEventId };
  };

  export const toProviderData = (
    event:
      | WithObjectId<Omit<LegacyEvent, "_id" | "recurrence">>
      | WithId<Omit<LegacyEvent, "_id" | "recurrence">>,
    provider?: CalendarProvider,
    base?:
      | WithObjectId<Omit<BaseEvent, "_id">>
      | WithId<Omit<BaseEvent, "_id">>,
  ) => {
    const isCInstance = isInstance(event);

    switch (provider) {
      case CalendarProvider.GOOGLE: {
        return isCInstance
          ? MapEvent.toGcalInstanceProviderData(
              event as WithObjectId<Omit<InstanceEvent, "_id">>,
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
  // Untitled Google events omit `summary` entirely; default to an empty
  // string (not "untitled") so a titleless event stays titleless (#1871).
  summary: "",
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
): WithoutId<ValidatedLegacyEvent> => {
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
  const startDate = isAllDay ? event.start?.date : event.start?.dateTime;
  const endDate = isAllDay ? event.end?.date : event.end?.dateTime;

  const _origin =
    event.extendedProperties?.private?.["origin"] ?? origin ?? Origin.GOOGLE;

  const compassEvent: LegacyEvent = {
    gEventId,
    user: userId,
    origin: _origin as Origin,
    title,
    description,
    isAllDay,
    startDate: startDate!,
    endDate: endDate!,
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
