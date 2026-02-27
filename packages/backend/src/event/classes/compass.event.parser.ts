import { ClientSession, ObjectId, WithId } from "mongodb";
import { Logger } from "@core/logger/winston.logger";
import {
  CalendarProvider,
  Categories_Recurrence,
  CompassEvent,
  Schema_Event,
  Schema_Event_Core,
  Schema_Event_Recur_Base,
  TransitionCategoriesRecurrence,
  TransitionStatus,
  WithCompassId,
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
import {
  _createCompassEvent,
  _createGcal,
  _deleteGcal,
  _deleteInstancesAfterUntil,
  _deleteSeries,
  _deleteSingleCompassEvent,
  _updateCompassEvent,
  _updateCompassSeries,
  _updateGcal,
} from "@backend/event/services/event.service";
import { Event_Transition, Operation_Sync } from "@backend/sync/sync.types";

export class CompassEventParser {
  #logger = Logger("app.event.classes.compass.event.parser");
  #_event: CompassEvent;
  #event!: WithId<Omit<Schema_Event, "_id">>;
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
      _id: new ObjectId(event.payload._id),
    } as WithId<Omit<Schema_Event, "_id">>;
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

    this.#title = this.#event.title ?? this.#event._id.toString() ?? "unknown";

    const status: TransitionStatus = this.#_event.status;
    const filter = { _id: this.#event._id, user: this.#event.user! };

    const event = this.#event;
    const cEvent = await mongoService.event.findOne(filter, { session });

    this.#dbEvent = cEvent ?? null;

    this.#isInstance = isInstance(event);
    this.#isDbInstance = cEvent ? isInstance(cEvent) : false;

    this.#isBase = isBase(event as Omit<Schema_Event, "_id">);
    this.#isDbBase = cEvent ? isBase(cEvent) : false;

    this.#isStandalone = isRegularEvent(event);
    this.#isDbStandalone = cEvent ? isRegularEvent(cEvent) : false;

    this.#rrule = this.#isBase
      ? new CompassEventRRule(
          event as WithId<Omit<Schema_Event_Recur_Base, "_id">>,
        )
      : null;

    this.#dbRrule = this.#isDbBase
      ? new CompassEventRRule(
          this.#dbEvent! as WithId<Omit<Schema_Event_Recur_Base, "_id">>,
        )
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
    const calendarProvider = CalendarProvider.GOOGLE;
    const provider = isSomeday ? CalendarProvider.COMPASS : calendarProvider;
    const userId = this.#event.user!;

    const compassEvent = (
      this.isBase ? this.rrule?.base(provider) : this.#event
    )!;

    const operation: Operation_Sync = `${this.#getCategory()}_CREATED`;
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
        await _createGcal(userId, cEvent);

        return [operationSummary];
      }
      default:
        return [];
    }
  }

  async updateEvent(session?: ClientSession): Promise<Event_Transition[]> {
    this.#logger.info(
      `UPDATING ${this.getTransitionString()}: ${this.#event._id.toString()} (Compass)`,
    );

    const calendarProvider = CalendarProvider.GOOGLE;
    const userId = this.#event.user!;
    const { isSomeday } = this.#event;
    const operation: Operation_Sync = `${this.category}_UPDATED`;
    const operationSummary = this.#getOperationSummary(operation);

    const cEvent = await _updateCompassEvent(
      { ...this.#event, user: userId },
      session,
    );

    if (!cEvent) return [];

    if (isSomeday) return [operationSummary];

    switch (calendarProvider) {
      case CalendarProvider.GOOGLE: {
        await _updateGcal(userId, cEvent as Schema_Event_Core);

        return [operationSummary];
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
    const calendarProvider = CalendarProvider.GOOGLE;
    const provider = isSomeday ? CalendarProvider.COMPASS : calendarProvider;
    const compassEvent = this.rrule!.base(provider);
    const userId = compassEvent.user!;
    const operation: Operation_Sync = `${this.category}_UPDATED`;
    const operationSummary = this.#getOperationSummary(operation);

    const rruleDiff = this.rrule?.diffOptions(this.dbRrule!) ?? [];
    const seriesSplit = rruleDiff.length > 0;

    let cEvent: WithCompassId<Omit<Schema_Event, "_id">> | null = null;

    if (seriesSplit) {
      /***************************************************************************
       * Series Split Logic ******************************************************
       * *************************************************************************
       * The path to follow if the db dates are stored uniformly eg. in UTC
       * is to generate the instance dates using the new rrule
       * and then:
       * - delete the instances that are no longer in the set
       * - create missing instances that are now present in the set
       * based on these dates from the db. eg.
       * *************************************************************************
       * const instances = this.rrule!.instances();
       * const availableStarts = instances.map((i) => i.startDate);
       * await _deleteSeries(
       *   userId,
       *   this.#event._id.toString(),
       *   { startDate: { $nin: availableStarts } },
       *   session,
       *   true,
       * );
       * *************************************************************************
       * We will respect only the UNTIL recurrence rule param for now
       * We will cancel instances after the UNTIL date for now
       * assuming the recurrence rule has an UNTIL date
       */
      const diffLength = rruleDiff.length;

      const untilOnlyChanged =
        rruleDiff[0]?.[0] === "until" && diffLength === 1;

      // until only changed
      if (untilOnlyChanged) {
        await _deleteInstancesAfterUntil(
          userId,
          this.#event._id.toString(),
          this.rrule!.options.until!,
          session,
        );

        cEvent = await _updateCompassSeries(
          { ...compassEvent, user: userId },
          session,
        );
      } else {
        // recreate instances
        await _deleteSeries(userId, this.#event._id.toString(), session, true);

        cEvent = await _createCompassEvent(
          { ...compassEvent, user: userId },
          calendarProvider,
          this.rrule,
          session,
        );
      }
    } else {
      cEvent = await _updateCompassSeries(
        { ...compassEvent, user: userId },
        session,
      );
    }

    if (!cEvent) return [];

    if (isSomeday) return [operationSummary];

    switch (calendarProvider) {
      case CalendarProvider.GOOGLE: {
        await _updateGcal(userId, cEvent as Schema_Event_Core);

        return [operationSummary];
      }
      default:
        return [];
    }
  }

  async deleteEvent(session?: ClientSession): Promise<Event_Transition[]> {
    this.#logger.info(
      `DELETING ${this.getTransitionString()}: ${this.#event._id.toString()} (Compass)`,
    );

    const calendarProvider = CalendarProvider.GOOGLE;
    const userId = this.#event.user!;
    const { isSomeday } = this.#event;
    const operation: Operation_Sync = `${this.category}_DELETED`;
    const operationSummary = this.#getOperationSummary(operation);

    const cEvent = (await _deleteSingleCompassEvent(
      { ...this.#event, user: userId },
      session,
    )) as Schema_Event_Core | null;

    if (!cEvent) return [];

    if (isSomeday) return [operationSummary];

    switch (calendarProvider) {
      case CalendarProvider.GOOGLE: {
        const ok = cEvent.gEventId
          ? await _deleteGcal(userId, cEvent.gEventId)
          : true;

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

    const calendarProvider = CalendarProvider.GOOGLE;
    const user = this.#event.user!;
    const operation: Operation_Sync = `${this.category}_UPDATED`;
    const operationSummary = this.#getOperationSummary(operation);

    const cEvent = await _createCompassEvent(
      { ...this.#event, user, isSomeday: true },
      calendarProvider,
      null,
      session,
    );

    if (!cEvent) return [];

    switch (calendarProvider) {
      case CalendarProvider.GOOGLE: {
        const ok = this.#event.gEventId
          ? await _deleteGcal(user, this.#event.gEventId)
          : true;

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

    const calendarProvider = CalendarProvider.GOOGLE;
    const user = this.#event.user!;
    const operation: Operation_Sync = `${this.category}_UPDATED`;
    const operationSummary = this.#getOperationSummary(operation);

    await _deleteSeries(user, this.#event._id.toString(), session, true);

    const cEvent = await _createCompassEvent(
      {
        ...this.#event,
        user,
        recurrence: this.#event.recurrence,
        isSomeday: true,
      },
      calendarProvider,
      this.rrule,
      session,
    );

    if (!cEvent) return [];

    switch (calendarProvider) {
      case CalendarProvider.GOOGLE: {
        const ok = this.#event.gEventId
          ? await _deleteGcal(user, this.#event.gEventId)
          : true;

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

    const calendarProvider = CalendarProvider.GOOGLE;
    const userId = this.#event.user!;
    const { isSomeday } = this.#event;
    const operation: Operation_Sync = `${this.category}_UPDATED`;
    const operationSummary = this.#getOperationSummary(operation);

    await _deleteSeries(userId, this.#event._id.toString(), session, true);

    const cEvent = (await _updateCompassEvent(
      { ...this.#event, user: userId },
      session,
    )) as Schema_Event_Core | null;

    if (!cEvent) return [];

    if (isSomeday) return [operationSummary];

    switch (calendarProvider) {
      case CalendarProvider.GOOGLE: {
        Object.assign(cEvent, { recurrence: null });

        await _updateGcal(userId, cEvent);

        return [operationSummary];
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

    const calendarProvider = CalendarProvider.GOOGLE;
    const userId = this.#event.user!;
    const { isSomeday } = this.#event;
    const operation: Operation_Sync = `${this.category}_UPDATED`;
    const operationSummary = this.#getOperationSummary(operation);

    const cEvent = (await _createCompassEvent(
      { ...this.#event, user: userId },
      calendarProvider,
      this.rrule,
      session,
    )) as Schema_Event_Core | null;

    if (!cEvent) return [];

    if (isSomeday) return [operationSummary];

    switch (calendarProvider) {
      case CalendarProvider.GOOGLE: {
        await _updateGcal(userId, cEvent);

        return [operationSummary];
      }
      default:
        return [];
    }
  }

  async cancelSeries(session?: ClientSession): Promise<Event_Transition[]> {
    this.#logger.info(
      `Cancelling SERIES: ${this.#event._id.toString()} (Gcal)`,
    );

    const calendarProvider = CalendarProvider.GOOGLE;
    const userId = this.#event.user!;
    const { isSomeday } = this.#event;
    const operation: Operation_Sync = `${this.category}_DELETED`;
    const operationSummary = this.#getOperationSummary(operation);

    await _deleteSeries(userId, this.#event._id.toString(), session);

    if (isSomeday) return [operationSummary];

    switch (calendarProvider) {
      case CalendarProvider.GOOGLE: {
        const ok = this.#event.gEventId
          ? await _deleteGcal(userId, this.#event.gEventId)
          : true;

        return ok ? [operationSummary] : [];
      }
      default:
        return [];
    }
  }

  #getCategory(): Categories_Recurrence {
    switch (true) {
      case this.#isStandalone && this.#event.isSomeday:
        return Categories_Recurrence.STANDALONE_SOMEDAY;
      case this.#isBase && this.#event.isSomeday:
        return Categories_Recurrence.RECURRENCE_BASE_SOMEDAY;
      case this.#isInstance && this.#event.isSomeday:
        return Categories_Recurrence.RECURRENCE_INSTANCE_SOMEDAY;
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
      case this.#isDbStandalone && this.#dbEvent?.isSomeday:
        return Categories_Recurrence.STANDALONE_SOMEDAY;
      case this.#isDbBase && this.#dbEvent?.isSomeday:
        return Categories_Recurrence.RECURRENCE_BASE_SOMEDAY;
      case this.#isDbInstance && this.#dbEvent?.isSomeday:
        return Categories_Recurrence.RECURRENCE_INSTANCE_SOMEDAY;
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
}
