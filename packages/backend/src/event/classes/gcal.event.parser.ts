import { ClientSession } from "mongodb";
import { MapGCalEvent } from "@core/mappers/map.gcal.event";
import { Schema_Calendar } from "@core/types/calendar.types";
import {
  Categories_Recurrence,
  EventStatus,
  Schema_Event,
  TransitionCategoriesRecurrence,
} from "@core/types/event.types";
import { WithGcalId, gSchema$Event } from "@core/types/gcal";
import { Event_Transition } from "@core/types/sync.types";
import { isBase, isInstance, isRegular } from "@core/util/event/event.util";
import {
  isBaseGCalEvent,
  isInstanceGCalEvent,
  isRegularGCalEvent,
} from "@core/util/event/gcal.event.util";
import { GenericError } from "@backend/common/errors/generic/generic.errors";
import { error } from "@backend/common/errors/handlers/error.handler";
import mongoService from "@backend/common/services/mongo.service";

export class GcalEventParser {
  #_event: WithGcalId<gSchema$Event>;
  #dbEvent!: Schema_Event | null;
  #event!: Schema_Event;
  #status!: EventStatus;
  #isInstance!: boolean;
  #isBase!: boolean;
  #isRegular!: boolean;
  #isCompassInstance!: boolean;
  #isCompassBase!: boolean;
  #isCompassRegular!: boolean;
  #transition!: Event_Transition["transition"];
  #calendar: Schema_Calendar;

  constructor({
    calendar,
    payload,
  }: {
    calendar: Schema_Calendar;
    payload: WithGcalId<gSchema$Event>;
  }) {
    this.#calendar = calendar;
    this.#_event = payload;
  }

  get event(): Schema_Event {
    return this.#ensureInitInvoked(this.#event);
  }

  get isInstance(): boolean {
    return this.#ensureInitInvoked(this.#isInstance);
  }

  get isBase(): boolean {
    return this.#ensureInitInvoked(this.#isBase);
  }

  get isRegular(): boolean {
    return this.#ensureInitInvoked(this.#isRegular);
  }

  get isCompassInstance(): boolean {
    return this.#ensureInitInvoked(this.#isCompassInstance);
  }

  get isCompassBase(): boolean {
    return this.#ensureInitInvoked(this.#isCompassBase);
  }

  get isCompassStandalone(): boolean {
    return this.#ensureInitInvoked(this.#isCompassRegular);
  }

  get status(): EventStatus {
    return this.#ensureInitInvoked(this.#status);
  }

  get transition(): Event_Transition["transition"] {
    return this.#ensureInitInvoked(this.#transition);
  }

  get category(): Categories_Recurrence {
    return this.#transition?.[0] ?? this.#getCategory();
  }

  getTransitionString(): `${Categories_Recurrence | "NIL"}->>${TransitionCategoriesRecurrence}` {
    return `${this.#transition[0] ?? "NIL"}->>${this.#transition[1]}`;
  }

  /**
   * init
   *
   * we need to fetch the compass event first to properly discriminate
   * the event types since they can be ambiguous if interpreted from
   * gcal sync watch  updates
   */
  async init(session?: ClientSession): Promise<void> {
    if (this.#dbEvent === null || !!this.#dbEvent) return;

    const gEventId = this.#_event.id;
    const status = this.#_event.status;

    this.#status = status as EventStatus;

    this.#dbEvent = await mongoService.event.findOne(
      { calendar: this.#calendar._id, "metadata.id": gEventId },
      { session },
    );

    this.#isInstance = isInstanceGCalEvent(this.#_event);
    this.#isCompassInstance = this.#dbEvent ? isInstance(this.#dbEvent) : false;

    this.#isBase = isBaseGCalEvent(this.#_event);
    this.#isCompassBase = this.#dbEvent ? isBase(this.#dbEvent) : false;

    this.#isRegular = isRegularGCalEvent(this.#_event);

    this.#isCompassRegular = this.#dbEvent ? isRegular(this.#dbEvent) : false;

    this.#event = MapGCalEvent.toEvent(this.#_event, {
      calendar: this.#calendar._id,
      _id: this.#dbEvent?._id,
      origin: this.#dbEvent?.origin,
      recurrence: this.#dbEvent?.recurrence,
    });

    this.#transition = [
      this.#getCompassCategory(),
      `${this.#getCategory()}_${this.#status}` as TransitionCategoriesRecurrence,
    ];
  }

  #getCategory(): Categories_Recurrence {
    switch (true) {
      case this.isInstance:
        return Categories_Recurrence.RECURRENCE_INSTANCE;
      case this.isBase:
        return Categories_Recurrence.RECURRENCE_BASE;
      case this.isRegular:
        return Categories_Recurrence.REGULAR;
      default:
        throw new Error("could not determine event category");
    }
  }

  #getCompassCategory(): Categories_Recurrence | null {
    switch (true) {
      case this.#isCompassRegular:
        return Categories_Recurrence.REGULAR;
      case this.#isCompassBase:
        return Categories_Recurrence.RECURRENCE_BASE;
      case this.#isCompassInstance:
        return Categories_Recurrence.RECURRENCE_INSTANCE;
      default:
        return null;
    }
  }

  #ensureInitInvoked<T = unknown>(value: T) {
    if (this.#dbEvent === undefined) {
      throw error(GenericError.DeveloperError, "did you call `init` yet");
    }

    return value;
  }
}
