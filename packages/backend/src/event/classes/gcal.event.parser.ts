import { ClientSession, UpdateFilter, WithId } from "mongodb";
import { Logger } from "@core/logger/winston.logger";
import { gEventToCompassEvent } from "@core/mappers/map.event";
import {
  Categories_Recurrence,
  Schema_Event,
  Schema_Event_Recur_Base,
  TransitionCategoriesRecurrence,
  TransitionStatus,
} from "@core/types/event.types";
import { WithGcalId, gSchema$Event, gSchema$EventBase } from "@core/types/gcal";
import {
  isBase,
  isInstance,
  isRegularEvent,
} from "@core/util/event/event.util";
import {
  isBaseGCalEvent,
  isInstanceGCalEvent,
  isRegularGCalEvent,
} from "@core/util/event/gcal.event.util";
import { GenericError } from "@backend/common/errors/generic/generic.errors";
import { error } from "@backend/common/errors/handlers/error.handler";
import mongoService from "@backend/common/services/mongo.service";
import { GcalEventRRule } from "@backend/event/classes/gcal.event.rrule";
import {
  mongoDateAggregation,
  stripReadonlyEventProps,
} from "@backend/event/services/recur/util/recur.util";
import { createSyncImport } from "@backend/sync/services/import/sync.import";
import { Event_Transition, Operation_Sync } from "@backend/sync/sync.types";

export class GcalEventParser {
  #logger = Logger("app.event.classes.gcal.parser");
  #event: WithGcalId<gSchema$Event>;
  #title!: string;
  #compassEvent!: WithId<Omit<Schema_Event, "_id">> | null;
  #isInstance!: boolean;
  #isBase!: boolean;
  #isStandalone!: boolean;
  #isCompassInstance!: boolean;
  #isCompassBase!: boolean;
  #isCompassStandalone!: boolean;
  #rrule!: GcalEventRRule | null;
  #compassRrule!: GcalEventRRule | null;
  #transition!: Event_Transition["transition"];
  #summary!: Omit<Event_Transition, "operation">;

  constructor(
    event: WithGcalId<gSchema$Event>,
    private userId: string,
  ) {
    this.#event = event;
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

  get isCompassInstance(): boolean {
    return this.#ensureInitInvoked(this.#isCompassInstance);
  }

  get isCompassBase(): boolean {
    return this.#ensureInitInvoked(this.#isCompassBase);
  }

  get isCompassStandalone(): boolean {
    return this.#ensureInitInvoked(this.#isCompassStandalone);
  }

  get rrule(): GcalEventRRule | null {
    return this.#ensureInitInvoked(this.#rrule);
  }

  get compassRrule(): GcalEventRRule | null {
    return this.#ensureInitInvoked(this.#compassRrule);
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
    if (this.#compassEvent === null || !!this.#compassEvent) return;

    this.#title = this.#event.summary ?? this.#event.id ?? "unknown";

    const gEventId = this.#event.id;
    const status = this.#event.status;
    const timeZone = this.#event.start?.timeZone;

    const transitionStatus: TransitionStatus =
      status == "cancelled" ? "CANCELLED" : "CONFIRMED";

    const cEvent = await mongoService.event.findOne({ gEventId }, { session });

    this.#compassEvent = cEvent ?? null;

    this.#isInstance = isInstanceGCalEvent(this.#event);
    this.#isCompassInstance = cEvent ? isInstance(cEvent) : false;

    this.#isBase = isBaseGCalEvent(this.#event);
    this.#isCompassBase = cEvent ? isBase(cEvent) : false;

    this.#isStandalone = isRegularGCalEvent(this.#event);
    this.#isCompassStandalone = cEvent ? isRegularEvent(cEvent) : false;

    this.#rrule = this.#isBase
      ? new GcalEventRRule(this.#event as gSchema$EventBase)
      : null;

    this.#compassRrule = this.#isCompassBase
      ? new GcalEventRRule({
          ...this.#event,
          start: cEvent?.isAllDay
            ? { date: cEvent?.startDate, timeZone }
            : { dateTime: cEvent?.startDate, timeZone },
          recurrence: cEvent!.recurrence!.rule!,
        })
      : null;

    this.#transition = [
      this.#getCompassCategory(),
      `${this.#getCategory()}_${transitionStatus}`,
    ];

    this.#summary = {
      title: this.#title,
      transition: this.#transition,
      category: this.category,
    };
  }

  async deleteCompassEvent(
    session?: ClientSession,
  ): Promise<Event_Transition[]> {
    this.#logger.info(
      `DELETING ${this.getTransitionString()}: ${this.#event.id} (Gcal)`,
    );

    const { deletedCount } = await mongoService.event.deleteOne(
      {
        gEventId: this.#event.id,
        user: this.userId,
      },
      { session },
    );

    return deletedCount > 0
      ? [this.#getOperationSummary(`${this.category}_DELETED`)]
      : [];
  }

  async upsertCompassEvent(
    data?: Pick<UpdateFilter<Omit<Schema_Event, "_id">>, "$set" | "$unset">,
    session?: ClientSession,
  ): Promise<Event_Transition[]> {
    let update: Exclude<typeof data, undefined> = data!;

    if (!data) {
      const event = gEventToCompassEvent(this.#event, this.userId);
      update = { $set: { ...event, updatedAt: new Date() } };
    }

    this.#logger.info(
      `UPSERTING ${this.getTransitionString()}: ${this.#event.id} (Gcal)`,
    );

    const { modifiedCount, upsertedCount } = await mongoService.event.updateOne(
      { gEventId: this.#event.id, user: this.userId },
      update,
      { upsert: true, session },
    );

    if (modifiedCount > 0) {
      return [this.#getOperationSummary(`${this.category}_UPDATED`)];
    }

    return upsertedCount > 0
      ? [this.#getOperationSummary(`${this.category}_CREATED`)]
      : [];
  }

  async createSeries(session?: ClientSession): Promise<Event_Transition[]> {
    const syncImport = await createSyncImport(this.userId);

    const { totalSaved } = await syncImport.importSeries(
      this.userId,
      "primary",
      this.#event as gSchema$EventBase,
      session,
    );

    return totalSaved > 0 ? [this.#getOperationSummary("SERIES_CREATED")] : [];
  }

  async updateSeries(session?: ClientSession): Promise<Event_Transition[]> {
    const rruleDiff = this.rrule?.diffOptions(this.#compassRrule!) ?? [];
    const seriesSplit = rruleDiff.length > 0;

    if (seriesSplit) return this.#splitSeries(session);

    return this.#updateRecurrence(session);
  }

  async cancelSeries(
    cancelBase = true,
    session?: ClientSession,
  ): Promise<Event_Transition[]> {
    this.#logger.info(`Cancelling SERIES: ${this.#event.id} (Gcal)`);

    const changes: Event_Transition[] = [];

    const { deletedCount } = await mongoService.event.deleteMany(
      {
        $or: [
          ...(cancelBase
            ? [{ gEventId: this.#event.id, user: this.userId }]
            : []),
          { gRecurringEventId: this.#event.id, user: this.userId },
        ],
        user: this.userId,
      },
      { session },
    );

    if (deletedCount > 0) {
      changes.push(this.#getOperationSummary("SERIES_DELETED"));
    }

    return changes;
  }

  async seriesToStandalone(
    session?: ClientSession,
  ): Promise<Event_Transition[]> {
    const seriesChanges = await this.cancelSeries(false, session);
    const event = gEventToCompassEvent(this.#event, this.userId);

    const {
      recurrence, // eslint-disable-line @typescript-eslint/no-unused-vars
      gRecurringEventId, // eslint-disable-line @typescript-eslint/no-unused-vars
      ...eventWithoutProps
    } = event;
    const baseChanges = await this.upsertCompassEvent({
      $unset: { recurrence: 1, gRecurringEventId: 1 },
      $set: {
        ...eventWithoutProps,
        updatedAt: new Date(),
      },
    });

    return [...seriesChanges, ...baseChanges];
  }

  async instanceToStandalone(
    session?: ClientSession,
  ): Promise<Event_Transition[]> {
    const event = gEventToCompassEvent(this.#event, this.userId);

    const {
      recurrence, // eslint-disable-line @typescript-eslint/no-unused-vars
      gRecurringEventId, // eslint-disable-line @typescript-eslint/no-unused-vars
      ...eventWithoutProps
    } = event;

    return this.upsertCompassEvent(
      {
        $unset: { recurrence: 1, gRecurringEventId: 1 },
        $set: {
          ...eventWithoutProps,
          updatedAt: new Date(),
        },
      },
      session,
    );
  }

  async standaloneToSeries(session?: ClientSession) {
    this.#logger.info(
      `UPDATING ${this.getTransitionString()}: ${this.#event.id} to series`,
    );

    const eventChanges = await this.upsertCompassEvent(undefined, session);
    const seriesChanges = await this.createSeries(session);

    return [...eventChanges, ...seriesChanges];
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

  #getCompassCategory(): Categories_Recurrence | null {
    switch (true) {
      case this.#isCompassStandalone:
        return Categories_Recurrence.STANDALONE;
      case this.#isCompassBase:
        return Categories_Recurrence.RECURRENCE_BASE;
      case this.#isCompassInstance:
        return Categories_Recurrence.RECURRENCE_INSTANCE;
      default:
        return null;
    }
  }

  #getOperationSummary(operation: Operation_Sync): Event_Transition {
    return this.#ensureInitInvoked({ ...this.summary, operation });
  }

  #ensureInitInvoked<T = unknown>(value: T) {
    if (this.#compassEvent === undefined) {
      throw error(GenericError.DeveloperError, "did you call `init` yet");
    }

    return value;
  }

  async #updateAllDayInstances(
    baseUpdate: ReturnType<typeof stripReadonlyEventProps>,
    session?: ClientSession,
  ): Promise<Event_Transition[]> {
    this.#logger.info(
      `UPDATING all-day instances for Gcal event: ${this.#event.id}`,
    );

    const { modifiedCount } = await mongoService.event.updateMany(
      { gRecurringEventId: this.#event.id, user: this.userId },
      { $set: baseUpdate },
      { session },
    );

    return modifiedCount > 0
      ? [this.#getOperationSummary("ALLDAY_INSTANCES_UPDATED")]
      : [];
  }

  async #updateTimedInstances(
    baseUpdate: ReturnType<typeof stripReadonlyEventProps> & {
      startDate: string;
      endDate: string;
    },
    session?: ClientSession,
  ): Promise<Event_Transition[]> {
    this.#logger.info(
      `UPDATING timed instances for Gcal event: ${this.#event.id}`,
    );

    // Update instances using MongoDB aggregation pipeline
    // to maintain year/day/month while updating the time
    const { modifiedCount } = await mongoService.event.updateMany(
      { gRecurringEventId: this.#event.id, user: this.userId },
      [
        {
          $set: {
            ...baseUpdate,
            ...mongoDateAggregation(
              new Date(baseUpdate.startDate),
              "startDate",
            ),
            ...mongoDateAggregation(new Date(baseUpdate.endDate), "endDate"),
          },
        },
      ],
      { session },
    );

    return modifiedCount > 0
      ? [this.#getOperationSummary("TIMED_INSTANCES_UPDATED")]
      : [];
  }

  async #updateRecurrence(
    session?: ClientSession,
  ): Promise<Event_Transition[]> {
    this.#logger.info(`Updating SERIES: ${this.#event.id} (Gcal)`);

    const event = gEventToCompassEvent(this.#event, this.userId);
    const update = { ...event, updatedAt: new Date() };

    const instanceUpdate = stripReadonlyEventProps(
      update as Schema_Event_Recur_Base,
    );

    // Update base event
    const eventChanges = await this.upsertCompassEvent(
      { $set: update },
      session,
    );

    if (event.isAllDay) {
      const allDayChanges = await this.#updateAllDayInstances(
        instanceUpdate,
        session,
      );

      return [...eventChanges, ...allDayChanges];
    }

    const timedInstancesChanges = await this.#updateTimedInstances(
      {
        ...instanceUpdate,
        startDate: update.startDate,
        endDate: update.endDate,
      },
      session,
    );

    return [...eventChanges, ...timedInstancesChanges];
  }

  async #splitSeries(session?: ClientSession): Promise<Event_Transition[]> {
    this.#logger.info(`Splitting SERIES: ${this.#event.id} (Gcal)`);

    const truncation = await this.cancelSeries(false, session);
    const series = await this.createSeries(session);
    const updates = await this.#updateRecurrence(session);

    return [...truncation, ...series, ...updates];
  }
}
