import { ClientSession, ObjectId } from "mongodb";
import { Logger } from "@core/logger/winston.logger";
import { CalendarProvider, Schema_Calendar } from "@core/types/calendar.types";
import {
  BaseEventSchema,
  Categories_Recurrence,
  EventSchema,
  EventStatus,
  EventUpdate,
  Schema_Event,
  TransitionCategoriesRecurrence,
} from "@core/types/event.types";
import { CompassEventRRule } from "@core/util/event/compass.event.rrule";
import {
  isBase,
  isInstance,
  isRegularEvent,
} from "@core/util/event/event.util";
import { GenericError } from "@backend/common/errors/generic/generic.errors";
import { error } from "@backend/common/errors/handlers/error.handler";
import mongoService from "@backend/common/services/mongo.service";
import eventService from "@backend/event/services/event.service";
import { Event_Transition, Operation_Sync } from "@backend/sync/sync.types";
import { StringV4Schema } from "../../../../core/src/types/type.utils";

export class CompassEventParser {
  #logger = Logger("app.event.classes.compass.event.parser");
  #_event: EventUpdate;
  #event!: Schema_Event;
  #calendar!: Schema_Calendar;
  #provider!: CalendarProvider;
  #user!: ObjectId;
  #title!: string;
  #dbEvent!: Schema_Event | null;
  #isInstance!: boolean;
  #isBase!: boolean;
  #isRegular!: boolean;
  #isDbInstance!: boolean;
  #isDbBase!: boolean;
  #isDbStandalone!: boolean;
  #rrule!: CompassEventRRule | null;
  #dbRrule!: CompassEventRRule | null;
  #transition!: Event_Transition["transition"];
  #summary!: Omit<Event_Transition, "operation">;

  constructor(event: EventUpdate) {
    const { COMPASS } = CalendarProvider;
    const { payload, calendar } = event;

    this.#_event = event;
    this.#event = EventSchema.parse({ ...payload, calendar: calendar._id });
    this.#calendar = calendar;
    this.#user = calendar.user;
    this.#provider = calendar.metadata.provider ?? COMPASS;
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

  get isDbInstance(): boolean {
    return this.#ensureInitInvoked(this.#isDbInstance);
  }

  get isDbBase(): boolean {
    return this.#ensureInitInvoked(this.#isDbBase);
  }

  get isDbRegular(): boolean {
    return this.#ensureInitInvoked(this.#isDbStandalone);
  }

  get rrule(): CompassEventRRule | null {
    return this.#ensureInitInvoked(this.#rrule);
  }

  get dbRrule(): CompassEventRRule | null {
    return this.#ensureInitInvoked(this.#dbRrule);
  }

  get transition(): Event_Transition["transition"] {
    return this.#ensureInitInvoked(this.#transition);
  }

  get category(): Categories_Recurrence {
    return this.#transition?.[0] ?? this.#getCategory();
  }

  get summary(): Omit<Event_Transition, "operation"> {
    return this.#ensureInitInvoked(this.#summary);
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

    this.#title = this.#event.title ?? this.#event._id.toString() ?? "unknown";

    const status: EventStatus = this.#_event.status;
    const filter = { _id: this.#event._id, calendar: this.#event.calendar };

    const event = this.#event;
    const cEvent = await mongoService.event.findOne(filter, { session });

    this.#dbEvent = cEvent ?? null;

    this.#isInstance = isInstance(event);
    this.#isDbInstance = cEvent ? isInstance(cEvent) : false;

    this.#isBase = isBase(event);
    this.#isDbBase = cEvent ? isBase(cEvent) : false;

    this.#isRegular = isRegularEvent(event);
    this.#isDbStandalone = cEvent ? isRegularEvent(cEvent) : false;

    this.#rrule = this.#isBase
      ? new CompassEventRRule(BaseEventSchema.parse(event))
      : null;

    this.#dbRrule = this.#isDbBase
      ? new CompassEventRRule(BaseEventSchema.parse(this.#dbEvent))
      : null;

    this.#transition = [
      this.#getDbCategory(),
      `${this.#getCategory()}_${status}`,
    ];

    this.#summary = {
      title: this.#title,
      transition: this.#transition,
      category: this.category,
    };
  }

  async createEvent(session?: ClientSession): Promise<Event_Transition[]> {
    this.#logger.info(
      `CREATING ${this.getTransitionString()}: ${this.#event._id.toString()} (Compass)`,
    );

    // create series in calendar providers
    const { isSomeday } = this.#event;

    const compassEvent = (this.isBase ? this.rrule?.base() : this.#event)!;
    const operation: Operation_Sync = `${this.#getCategory()}_CREATED`;
    const operationSummary = this.#getOperationSummary(operation);

    const cEvent = await eventService.create(compassEvent, this.rrule, session);

    if (!this.#_event.providerSync) return [operationSummary];

    if (!cEvent) return [];

    if (isSomeday) return [operationSummary];

    switch (this.#provider) {
      case CalendarProvider.GOOGLE: {
        const event = await eventService.createGcalEvent(
          this.#user,
          this.#calendar.metadata.id,
          cEvent,
        );

        return event ? [operationSummary] : [];
      }
      default:
        return [];
    }
  }

  async updateEvent(session?: ClientSession): Promise<Event_Transition[]> {
    this.#logger.info(
      `UPDATING ${this.getTransitionString()}: ${this.#event._id.toString()} (Compass)`,
    );

    const { isSomeday } = this.#event;
    const operation: Operation_Sync = `${this.category}_UPDATED`;
    const operationSummary = this.#getOperationSummary(operation);

    const cEvent = await eventService.update(this.#event, session);

    if (!this.#_event.providerSync) return [operationSummary];

    if (!cEvent) return [];

    if (isSomeday) return [operationSummary];

    switch (this.#provider) {
      case CalendarProvider.GOOGLE: {
        const event = await eventService.updateGcalEvent(
          this.#user,
          this.#calendar.metadata.id,
          cEvent,
        );

        return event ? [operationSummary] : [];
      }
      default:
        return [];
    }
  }

  async updateSeries(session?: ClientSession): Promise<Event_Transition[]> {
    this.#logger.info(
      `UPDATING ${this.getTransitionString()}: ${this.#event._id.toString()} (Compass)`,
    );

    const { isSomeday } = this.#event;
    const compassEvent = this.rrule!.base();
    const operation: Operation_Sync = `${this.category}_UPDATED`;
    const operationSummary = this.#getOperationSummary(operation);
    const update: Partial<Schema_Event> = this.#event; // @TODO diff base event in db with this.#event

    const cEvent: Schema_Event | null = null;

    await eventService.updateSeries(compassEvent, update, session);

    if (!this.#_event.providerSync) return [operationSummary];

    if (!cEvent) return [];

    if (isSomeday) return [operationSummary];

    switch (this.#provider) {
      case CalendarProvider.GOOGLE: {
        const event = await eventService.updateGcalEvent(
          this.#user,
          this.#calendar.metadata.id,
          cEvent,
        );

        return event ? [operationSummary] : [];
      }
      default:
        return [];
    }
  }

  async deleteEvent(session?: ClientSession): Promise<Event_Transition[]> {
    this.#logger.info(
      `DELETING ${this.getTransitionString()}: ${this.#event._id.toString()} (Compass)`,
    );

    const { isSomeday } = this.#event;
    const operation: Operation_Sync = `${this.category}_DELETED`;
    const operationSummary = this.#getOperationSummary(operation);

    const cEvent = await eventService.delete(this.#event, session);

    if (!this.#_event.providerSync) return [operationSummary];

    if (!cEvent) return [];

    if (isSomeday) return [operationSummary];

    switch (this.#provider) {
      case CalendarProvider.GOOGLE: {
        const ok = await eventService.deleteGcalEvent(
          this.#user,
          this.#calendar.metadata.id,
          StringV4Schema.parse(cEvent.metadata?.id),
        );

        return ok ? [operationSummary] : [];
      }
      default:
        return [];
    }
  }

  async standaloneToSomeday(
    session?: ClientSession,
  ): Promise<Event_Transition[]> {
    this.#logger.info(
      `UPDATING ${this.getTransitionString()}: ${this.#event._id.toString()} (Compass)`,
    );

    const operation: Operation_Sync = `${this.category}_UPDATED`;
    const operationSummary = this.#getOperationSummary(operation);

    const cEvent = await eventService.create(
      { ...this.#event, isSomeday: true },
      null,
      session,
    );

    if (!this.#_event.providerSync) return [operationSummary];

    if (!cEvent) return [];

    switch (this.#provider) {
      case CalendarProvider.GOOGLE: {
        const ok = await eventService.deleteGcalEvent(
          this.#user,
          this.#calendar.metadata.id,
          StringV4Schema.parse(cEvent.metadata?.id),
        );

        return ok ? [operationSummary] : [];
      }
      default:
        return [];
    }
  }

  async seriesToSomedaySeries(
    session?: ClientSession,
  ): Promise<Event_Transition[]> {
    this.#logger.info(
      `UPDATING ${this.getTransitionString()}: ${this.#event._id.toString()} (Compass)`,
    );

    const operation: Operation_Sync = `${this.category}_UPDATED`;
    const operationSummary = this.#getOperationSummary(operation);

    await eventService.deleteSeries(
      BaseEventSchema.parse(this.#event),
      session,
      true,
    );

    const cEvent = await eventService.create(
      { ...this.#event, isSomeday: true },
      this.rrule,
      session,
    );

    if (!this.#_event.providerSync) return [operationSummary];

    if (!cEvent) return [];

    switch (this.#provider) {
      case CalendarProvider.GOOGLE: {
        const ok = await eventService.deleteGcalEvent(
          this.#user,
          this.#calendar.metadata.id,
          StringV4Schema.parse(cEvent.metadata?.id),
        );

        return ok ? [operationSummary] : [];
      }
      default:
        return [];
    }
  }

  async seriesToStandalone(
    session?: ClientSession,
  ): Promise<Event_Transition[]> {
    this.#logger.info(
      `UPDATING ${this.getTransitionString()}: ${this.#event._id.toString()} (Compass)`,
    );

    const { isSomeday } = this.#event;
    const operation: Operation_Sync = `${this.category}_UPDATED`;
    const operationSummary = this.#getOperationSummary(operation);

    await eventService.deleteSeries(
      BaseEventSchema.parse(this.#event),
      session,
      true,
    );

    const cEvent = await eventService.update(this.#event, session);

    if (!this.#_event.providerSync) return [operationSummary];

    if (!cEvent) return [];

    if (isSomeday) return [operationSummary];

    switch (this.#provider) {
      case CalendarProvider.GOOGLE: {
        Object.assign(cEvent, { recurrence: null });

        const event = await eventService.updateGcalEvent(
          this.#user,
          this.#calendar.metadata.id,
          cEvent,
        );

        return event ? [operationSummary] : [];
      }
      default:
        return [];
    }
  }

  async standaloneToSeries(
    session?: ClientSession,
  ): Promise<Event_Transition[]> {
    this.#logger.info(
      `UPDATING ${this.getTransitionString()}: ${this.#event._id.toString()} (Compass)`,
    );

    const { isSomeday } = this.#event;
    const operation: Operation_Sync = `${this.category}_UPDATED`;
    const operationSummary = this.#getOperationSummary(operation);

    const cEvent = await eventService.create(this.#event, this.rrule, session);

    if (!this.#_event.providerSync) return [operationSummary];

    if (!cEvent) return [];

    if (isSomeday) return [operationSummary];

    switch (this.#provider) {
      case CalendarProvider.GOOGLE: {
        const event = await eventService.updateGcalEvent(
          this.#user,
          this.#calendar.metadata.id,
          cEvent,
        );

        return event ? [operationSummary] : [];
      }
      default:
        return [];
    }
  }

  async cancelSeries(session?: ClientSession): Promise<Event_Transition[]> {
    this.#logger.info(
      `Cancelling SERIES: ${this.#event._id.toString()} (Gcal)`,
    );

    const { isSomeday } = this.#event;
    const operation: Operation_Sync = `${this.category}_DELETED`;
    const operationSummary = this.#getOperationSummary(operation);

    await eventService.deleteSeries(
      BaseEventSchema.parse(this.#event),
      session,
    );

    if (!this.#_event.providerSync) return [operationSummary];

    if (isSomeday) return [operationSummary];

    switch (this.#provider) {
      case CalendarProvider.GOOGLE: {
        const ok = await eventService.deleteGcalEvent(
          this.#user,
          this.#calendar.metadata.id,
          StringV4Schema.parse(this.#event.metadata?.id),
        );

        return ok ? [operationSummary] : [];
      }
      default:
        return [];
    }
  }

  #getCategory(): Categories_Recurrence {
    switch (true) {
      case this.#isInstance && this.#event.isSomeday:
        return Categories_Recurrence.RECURRENCE_INSTANCE_SOMEDAY;
      case this.#isBase && this.#event.isSomeday:
        return Categories_Recurrence.RECURRENCE_BASE_SOMEDAY;
      case this.#isRegular && this.#event.isSomeday:
        return Categories_Recurrence.REGULAR_SOMEDAY;
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

  #getDbCategory(): Categories_Recurrence | null {
    switch (true) {
      case this.#isDbInstance && this.#dbEvent?.isSomeday:
        return Categories_Recurrence.RECURRENCE_INSTANCE_SOMEDAY;
      case this.#isDbBase && this.#dbEvent?.isSomeday:
        return Categories_Recurrence.RECURRENCE_BASE_SOMEDAY;
      case this.#isDbStandalone && this.#dbEvent?.isSomeday:
        return Categories_Recurrence.REGULAR_SOMEDAY;
      case this.#isDbInstance:
        return Categories_Recurrence.RECURRENCE_INSTANCE;
      case this.#isDbStandalone:
        return Categories_Recurrence.REGULAR;
      case this.#isDbBase:
        return Categories_Recurrence.RECURRENCE_BASE;
      default:
        return null;
    }
  }

  #getOperationSummary(operation: Operation_Sync): Event_Transition {
    return this.#ensureInitInvoked({ ...this.summary, operation });
  }

  #ensureInitInvoked<T = unknown>(value: T) {
    if (this.#dbEvent === undefined) {
      throw error(GenericError.DeveloperError, "did you call `init` yet");
    }

    return value;
  }
}
