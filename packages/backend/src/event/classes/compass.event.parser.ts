import { ClientSession, ObjectId, WithId } from "mongodb";
import { Logger } from "@core/logger/winston.logger";
import { MapEvent } from "@core/mappers/map.event";
import {
  CalendarProvider,
  Categories_Recurrence,
  CompassEvent,
  EventUpdatePayload,
  EventUpdateSchema,
  Schema_Event,
  Schema_Event_Core,
  TransitionCategoriesRecurrence,
  TransitionStatus,
} from "@core/types/event.types";
import {
  isBase,
  isInstance,
  isRegularEvent,
} from "@core/util/event/event.util";
import { GenericError } from "@backend/common/errors/generic/generic.errors";
import { error } from "@backend/common/errors/handlers/error.handler";
import mongoService from "@backend/common/services/mongo.service";
import { CompassEventRRule } from "@backend/event/classes/compass.event.rrule";
import {
  _createCompassEvent,
  _createGcalEvent,
  _deleteGcal,
  _deleteInstances,
  _deleteSingleCompassEvent,
  _updateCompassSeries,
  _updateGcal,
  _updateSingleCompassEvent,
} from "@backend/event/services/event.service";
import { Event_Transition, Operation_Sync } from "@backend/sync/sync.types";

export class CompassEventParser {
  #logger = Logger("app.event.classes.compass.event.parser");
  #_event: CompassEvent;
  #event!: WithId<Omit<Schema_Event, "_id" | "recurrence">> & {
    recurrence?: Schema_Event["recurrence"] | null;
  };
  #title!: string;
  #dbEvent!: WithId<Omit<Schema_Event, "_id">> | null;
  #isInstance!: boolean;
  #isBase!: boolean;
  #isStandalone!: boolean;
  #isDbInstance!: boolean;
  #isDbBase!: boolean;
  #isDbStandalone!: boolean;
  #rrule!: CompassEventRRule | null;
  #dbRrule!: CompassEventRRule | null;
  #transition!: Event_Transition["transition"];
  #summary!: Omit<Event_Transition, "operation">;

  constructor(event: CompassEvent) {
    this.#_event = event;

    this.#event = {
      ...event.payload,
      _id: new ObjectId(event.eventId ?? event.payload._id),
    };
  }

  get isInstance(): boolean {
    return this.#ensureInitInvoked(this.#isInstance);
  }

  get isBase(): boolean {
    return this.#ensureInitInvoked(this.#isBase);
  }

  get isStandalone(): boolean {
    return this.#ensureInitInvoked(this.#isStandalone);
  }

  get isDbInstance(): boolean {
    return this.#ensureInitInvoked(this.#isDbInstance);
  }

  get isDbBase(): boolean {
    return this.#ensureInitInvoked(this.#isDbBase);
  }

  get isDbStandalone(): boolean {
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

    this.#title = this.#event.title ?? this.#_event.eventId ?? "unknown";

    const status: TransitionStatus = this.#_event.status;
    const filter = this.getDefaultEventFilter();

    const cEvent = await mongoService.event.findOne(filter, { session });

    this.#dbEvent = cEvent ?? null;

    this.#isInstance = isInstance(this.#event);
    this.#isDbInstance = cEvent ? isInstance(cEvent) : false;

    this.#isBase = isBase(this.#event);
    this.#isDbBase = cEvent ? isBase(cEvent) : false;

    this.#isStandalone = isRegularEvent(this.#event);
    this.#isDbStandalone = cEvent ? isRegularEvent(cEvent) : false;

    this.#rrule = this.#isBase ? new CompassEventRRule(this.#event) : null;

    this.#dbRrule = this.#isDbBase
      ? new CompassEventRRule(this.#dbEvent!)
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

  private getDefaultEventFilter(): { _id: ObjectId; user: string } {
    const _id = this.#event._id;
    const user = this.#event.user ?? this.#_event.userId;

    return { _id, user };
  }

  async createEvent(session?: ClientSession): Promise<Event_Transition[]> {
    this.#logger.info(
      `CREATING ${this.getTransitionString()}: ${this.#_event.eventId} (Compass)`,
    );
    // create series in calendar providers
    const calendarProvider = CalendarProvider.GOOGLE;
    const userId = this.getDefaultEventFilter().user;
    const compassEvent = this.isBase ? this.rrule!.base() : this.#event;
    const { isSomeday } = compassEvent;
    const operation: Operation_Sync = `${this.category}_CREATED`;
    const operationSummary = this.#getOperationSummary(operation);

    const cEvent = (await _createCompassEvent(
      { ...compassEvent, user: userId },
      calendarProvider,
      this.rrule,
      session,
    )) as Schema_Event_Core | null;

    if (!cEvent) return [];

    if (isSomeday) return [operationSummary];

    switch (calendarProvider) {
      case CalendarProvider.GOOGLE: {
        const event = await _createGcalEvent(userId, cEvent);

        return event ? [operationSummary] : [];
      }
      default:
        return [];
    }
  }

  async updateEvent(session?: ClientSession): Promise<Event_Transition[]> {
    this.#logger.info(
      `UPDATING ${this.getTransitionString()}: ${this.#_event.eventId} (Compass)`,
    );

    const calendarProvider = CalendarProvider.GOOGLE;
    const userId = this.getDefaultEventFilter().user;
    const compassEvent = this.isBase ? this.rrule!.base() : this.#event;
    const { isSomeday, _id } = compassEvent;
    const previouslySomeday = this.#dbEvent?.isSomeday ?? false;
    const createSomedayCalEvent = previouslySomeday && !isSomeday;
    const deleteSomedayCalEvent = !previouslySomeday && isSomeday;
    const operation: Operation_Sync = `${this.category}_UPDATED`;
    const operationSummary = this.#getOperationSummary(operation);

    let updatedEvent = { ...compassEvent };

    if (createSomedayCalEvent) {
      Object.assign(
        updatedEvent,
        MapEvent.toProviderData(compassEvent, calendarProvider),
      );
    } else if (deleteSomedayCalEvent) {
      updatedEvent = Object.assign(
        MapEvent.removeIdentifyingData(updatedEvent),
        { _id },
      );
    }

    const cEvent = await _updateSingleCompassEvent(
      { ...updatedEvent, user: userId },
      deleteSomedayCalEvent,
      session,
    );

    if (!cEvent) return [];

    if (isSomeday && previouslySomeday) return [operationSummary];

    switch (calendarProvider) {
      case CalendarProvider.GOOGLE: {
        if (deleteSomedayCalEvent && compassEvent.gEventId) {
          // event transitioned to someday, delete from gcal
          const ok = await _deleteGcal(userId, compassEvent.gEventId);

          return ok ? [operationSummary] : [];
        } else if (createSomedayCalEvent) {
          // event transitioned from someday, create in gcal
          const event = await _createGcalEvent(
            userId,
            cEvent as Schema_Event_Core,
          );

          return event ? [operationSummary] : [];
        }

        const event = await _updateGcal(userId, cEvent as Schema_Event_Core);

        return event ? [operationSummary] : [];
      }
      default:
        return [];
    }
  }

  async updateSeries(session?: ClientSession): Promise<Event_Transition[]> {
    this.#logger.info(
      `UPDATING ${this.getTransitionString()}: ${this.#_event.eventId} (Compass)`,
    );

    const calendarProvider = CalendarProvider.GOOGLE;
    const userId = this.getDefaultEventFilter().user;
    const compassEvent = this.isBase ? this.rrule!.base() : this.#event;
    const { isSomeday } = compassEvent;
    const operation: Operation_Sync = `${this.category}_UPDATED`;
    const operationSummary = this.#getOperationSummary(operation);
    /***************************************************************************
     * Series Split Logic ******************************************************
     * *************************************************************************
     * The path to follow if the db dates are stored uniformly eg. in UTC
     * is to generate the instance dates using the new rrule
     * and then delete the instances that are no longer in the set
     * based on these dates from the db. eg.
     * *************************************************************************
     * const instances = this.rrule!.instances();
     * const availableStarts = instances.map((i) => i.startDate);
     * await _deleteInstances(
     *   userId,
     *   this.#event._id.toString(),
     *   { startDate: { $nin: availableStarts } },
     *   session,
     * );
     * *************************************************************************
     * We will respect only the UNTIL recurrence rule param for now
     * We will cancel instances after the UNTIL date for now
     * assuming the recurrence rule has an UNTIL date
     */
    const hasUntilDate = this.rrule?.options.until instanceof Date;

    if (hasUntilDate) {
      await _deleteInstances(
        userId,
        this.#event._id.toString(),
        { startDate: { $gt: this.rrule?.options.until?.toISOString() } },
        session,
      );
    }

    // determine what changed in the series
    const changes = this.#diffChanges(compassEvent);
    // update the whole series with exactly those changes
    const cEvent = (await _updateCompassSeries(
      { ...compassEvent, user: userId },
      changes,
      session,
    )) as Schema_Event_Core | null;

    if (!cEvent) return [];

    if (isSomeday) return [operationSummary];

    switch (calendarProvider) {
      case CalendarProvider.GOOGLE: {
        const event = await _updateGcal(userId, cEvent);

        return event ? [operationSummary] : [];
      }
      default:
        return [];
    }
  }

  async deleteEvent(session?: ClientSession): Promise<Event_Transition[]> {
    this.#logger.info(
      `DELETING ${this.getTransitionString()}: ${this.#_event.eventId} (Compass)`,
    );

    const calendarProvider = CalendarProvider.GOOGLE;
    const userId = this.getDefaultEventFilter().user;
    const compassEvent = this.isBase ? this.rrule!.base() : this.#event;
    const { isSomeday } = compassEvent;
    const operation: Operation_Sync = `${this.category}_UPDATED`;
    const operationSummary = this.#getOperationSummary(operation);

    const cEvent = (await _deleteSingleCompassEvent(
      { ...compassEvent, user: userId },
      session,
    )) as Schema_Event_Core | null;

    if (!cEvent) return [];

    if (isSomeday) return [operationSummary];

    switch (calendarProvider) {
      case CalendarProvider.GOOGLE: {
        const ok = await _deleteGcal(userId, cEvent.gEventId!);

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
      `UPDATING ${this.getTransitionString()}: ${this.#_event.eventId} (Compass)`,
    );

    const calendarProvider = CalendarProvider.GOOGLE;
    const userId = this.getDefaultEventFilter().user;
    const compassEvent = this.#event;
    const { isSomeday } = compassEvent;
    const operation: Operation_Sync = `${this.category}_UPDATED`;
    const operationSummary = this.#getOperationSummary(operation);

    await _deleteInstances(userId, this.#event._id.toString(), {}, session);

    const cEvent = (await _updateSingleCompassEvent(
      { ...compassEvent, user: userId },
      false,
      session,
    )) as Schema_Event_Core | null;

    if (!cEvent) return [];

    if (isSomeday) return [operationSummary];

    Object.assign(cEvent, { recurrence: null });

    switch (calendarProvider) {
      case CalendarProvider.GOOGLE: {
        const event = await _updateGcal(userId, cEvent);

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
      `UPDATING ${this.getTransitionString()}: ${this.#_event.eventId} (Compass)`,
    );

    const calendarProvider = CalendarProvider.GOOGLE;
    const userId = this.getDefaultEventFilter().user;
    const compassEvent = this.#event;
    const { isSomeday } = compassEvent;
    const operation: Operation_Sync = `${this.category}_UPDATED`;
    const operationSummary = this.#getOperationSummary(operation);

    const cEvent = (await _createCompassEvent(
      { ...compassEvent, user: userId },
      calendarProvider,
      this.rrule,
      session,
    )) as Schema_Event_Core | null;

    if (!cEvent) return [];

    if (isSomeday) return [operationSummary];

    switch (calendarProvider) {
      case CalendarProvider.GOOGLE: {
        const event = await _updateGcal(userId, cEvent);

        return event ? [operationSummary] : [];
      }
      default:
        return [];
    }
  }

  async cancelSeries(session?: ClientSession): Promise<Event_Transition[]> {
    this.#logger.info(`Cancelling SERIES: ${this.#_event.eventId} (Gcal)`);

    const calendarProvider = CalendarProvider.GOOGLE;
    const userId = this.getDefaultEventFilter().user;
    const compassEvent = this.#event;
    const { isSomeday } = compassEvent;
    const operation: Operation_Sync = `${this.category}_UPDATED`;
    const operationSummary = this.#getOperationSummary(operation);

    await _deleteInstances(userId, this.#event._id.toString(), {}, session);

    const cEvent = (await _deleteSingleCompassEvent(
      { ...compassEvent, user: userId },
      session,
    )) as Schema_Event_Core | null;

    if (!cEvent) return [];

    if (isSomeday) return [operationSummary];

    Object.assign(cEvent, { recurrence: null });

    switch (calendarProvider) {
      case CalendarProvider.GOOGLE: {
        const ok = await _deleteGcal(userId, cEvent.gEventId!);

        return ok ? [operationSummary] : [];
      }
      default:
        return [];
    }
  }

  #getCategory(): Categories_Recurrence {
    switch (true) {
      case this.isStandalone:
        return Categories_Recurrence.STANDALONE;
      case this.isBase:
        return Categories_Recurrence.RECURRENCE_BASE;
      case this.isInstance:
        return Categories_Recurrence.RECURRENCE_INSTANCE;
      default:
        throw new Error("could not determine event category");
    }
  }

  #getDbCategory(): Categories_Recurrence | null {
    switch (true) {
      case this.#isDbStandalone:
        return Categories_Recurrence.STANDALONE;
      case this.#isDbBase:
        return Categories_Recurrence.RECURRENCE_BASE;
      case this.#isDbInstance:
        return Categories_Recurrence.RECURRENCE_INSTANCE;
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

  #diffChanges(payload: EventUpdatePayload): EventUpdatePayload {
    const changes: EventUpdatePayload = EventUpdateSchema.parse(payload);

    if (!this.#isSeriesSplit()) delete changes.recurrence;

    return changes;
  }

  #isSeriesSplit(): boolean {
    if (!(this.isDbBase || this.isBase)) return false;

    const dbRule = this.#dbRrule?.toString();
    const rrule = this.#rrule?.toString();
    const ruleDiverged = dbRule !== rrule;

    return ruleDiverged;
  }
}
