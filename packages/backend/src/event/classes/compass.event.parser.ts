import { ObjectId, type WithId } from "mongodb";
import {
  CalendarProvider,
  Categories_Recurrence,
  type CompassEvent,
  type Schema_Event,
  type Schema_Event_Recur_Base,
  type TransitionCategoriesRecurrence,
  type TransitionStatus,
} from "@core/types/event.types";
import { CompassEventRRule } from "@core/util/event/compass.event.rrule";
import {
  isBase,
  isInstance,
  isRegularEvent,
} from "@core/util/event/event.util";
import { GenericError } from "@backend/common/errors/generic/generic.errors";
import { error } from "@backend/common/errors/handlers/error.handler";
import {
  type Event_Transition,
  type Operation_Sync,
} from "@backend/sync/sync.types";

type NormalizedCompassEvent = WithId<Omit<Schema_Event, "_id">>;
type CompassTransitionKey =
  `${Categories_Recurrence | "NIL"}->>${TransitionCategoriesRecurrence}`;

export type CompassMutation =
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "UPDATE_SERIES"
  | "RECREATE_SERIES"
  | "TRUNCATE_SERIES";

export type GoogleEffectPlan =
  | { type: "none" }
  | { type: "create" }
  | { type: "update" }
  | { type: "delete"; deleteEventId?: string };

export type CompassPersistenceStep =
  | {
      type: "create";
      event: NormalizedCompassEvent;
      rrule: CompassEventRRule | null;
    }
  | {
      type: "update";
      event: NormalizedCompassEvent;
    }
  | {
      type: "update_series";
      event: NormalizedCompassEvent;
    }
  | {
      type: "delete_single";
      event: NormalizedCompassEvent;
    }
  | {
      type: "delete_series";
      userId: string;
      baseId: string;
      keepBase: boolean;
    }
  | {
      type: "delete_instances_after_until";
      userId: string;
      baseId: string;
      until: Date;
    };

export type CompassTransitionContext = {
  event: NormalizedCompassEvent;
  dbEvent: WithId<Omit<Schema_Event, "_id">> | null;
  eventCategory: Categories_Recurrence;
  dbCategory: Categories_Recurrence | null;
  transition: [Categories_Recurrence | null, TransitionCategoriesRecurrence];
  summary: Omit<Event_Transition, "operation">;
  transitionKey: CompassTransitionKey;
  isBase: boolean;
  isInstance: boolean;
  isStandalone: boolean;
  isDbBase: boolean;
  isDbInstance: boolean;
  isDbStandalone: boolean;
  rrule: CompassEventRRule | null;
  dbRrule: CompassEventRRule | null;
};

export type CompassOperationPlan = {
  summary: Omit<Event_Transition, "operation">;
  operation: Operation_Sync;
  transitionKey: CompassTransitionKey;
  provider: CalendarProvider;
  compassMutation: CompassMutation;
  googleEffect: GoogleEffectPlan;
  event: NormalizedCompassEvent;
  rrule: CompassEventRRule | null;
  steps: CompassPersistenceStep[];
  clearRecurrenceBeforeGoogleUpdate?: boolean;
};

type PlanBuilder = (context: CompassTransitionContext) => CompassOperationPlan;

function normalizeCompassEvent(event: CompassEvent): NormalizedCompassEvent {
  return {
    ...event.payload,
    _id: new ObjectId(event.payload._id),
  } as NormalizedCompassEvent;
}

function getCategory(
  event: Pick<Schema_Event, "isSomeday">,
  {
    isStandalone,
    isBase,
    isInstance,
  }: Pick<CompassTransitionContext, "isStandalone" | "isBase" | "isInstance">,
): Categories_Recurrence {
  switch (true) {
    case isStandalone && !!event.isSomeday:
      return Categories_Recurrence.STANDALONE_SOMEDAY;
    case isBase && !!event.isSomeday:
      return Categories_Recurrence.RECURRENCE_BASE_SOMEDAY;
    case isInstance && !!event.isSomeday:
      return Categories_Recurrence.RECURRENCE_INSTANCE_SOMEDAY;
    case isStandalone:
      return Categories_Recurrence.STANDALONE;
    case isBase:
      return Categories_Recurrence.RECURRENCE_BASE;
    case isInstance:
      return Categories_Recurrence.RECURRENCE_INSTANCE;
    default:
      throw error(
        GenericError.DeveloperError,
        "could not determine event category",
      );
  }
}

function getDbCategory(
  dbEvent: WithId<Omit<Schema_Event, "_id">> | null,
  context: Pick<
    CompassTransitionContext,
    "isDbStandalone" | "isDbBase" | "isDbInstance"
  >,
): Categories_Recurrence | null {
  switch (true) {
    case context.isDbStandalone && !!dbEvent?.isSomeday:
      return Categories_Recurrence.STANDALONE_SOMEDAY;
    case context.isDbBase && !!dbEvent?.isSomeday:
      return Categories_Recurrence.RECURRENCE_BASE_SOMEDAY;
    case context.isDbInstance && !!dbEvent?.isSomeday:
      return Categories_Recurrence.RECURRENCE_INSTANCE_SOMEDAY;
    case context.isDbStandalone:
      return Categories_Recurrence.STANDALONE;
    case context.isDbBase:
      return Categories_Recurrence.RECURRENCE_BASE;
    case context.isDbInstance:
      return Categories_Recurrence.RECURRENCE_INSTANCE;
    default:
      return null;
  }
}

function getProvider(event: Pick<Schema_Event, "isSomeday">): CalendarProvider {
  return event.isSomeday ? CalendarProvider.COMPASS : CalendarProvider.GOOGLE;
}

function getGoogleDeleteEventId(
  context: Pick<CompassTransitionContext, "dbEvent" | "event">,
): string | undefined {
  return context.dbEvent?.gEventId ?? context.event.gEventId;
}

function getSeriesEvent(
  context: Pick<CompassTransitionContext, "rrule" | "event">,
  provider: CalendarProvider,
): NormalizedCompassEvent {
  if (!context.rrule) {
    throw error(
      GenericError.DeveloperError,
      "missing recurrence rule for series operation",
    );
  }

  return context.rrule.base(provider) as NormalizedCompassEvent;
}

function createPlan(
  context: CompassTransitionContext,
  config: Omit<CompassOperationPlan, "summary" | "transitionKey">,
): CompassOperationPlan {
  return {
    ...config,
    summary: context.summary,
    transitionKey: context.transitionKey,
  };
}

function buildCreatePlan(
  context: CompassTransitionContext,
): CompassOperationPlan {
  const provider = getProvider(context.event);
  const event = context.isBase
    ? getSeriesEvent(context, provider)
    : context.event;
  const googleEffect = context.event.isSomeday
    ? ({ type: "none" } as const)
    : ({ type: "create" } as const);

  return createPlan(context, {
    provider,
    compassMutation: "CREATE",
    googleEffect,
    operation: `${context.eventCategory}_CREATED`,
    event,
    rrule: context.rrule,
    steps: [{ type: "create", event, rrule: context.rrule }],
  });
}

function buildUpdatePlan(
  context: CompassTransitionContext,
): CompassOperationPlan {
  return createPlan(context, {
    provider: getProvider(context.event),
    compassMutation: "UPDATE",
    googleEffect: context.event.isSomeday
      ? ({ type: "none" } as const)
      : ({ type: "update" } as const),
    operation: `${context.summary.category}_UPDATED`,
    event: context.event,
    rrule: context.rrule,
    steps: [{ type: "update", event: context.event }],
  });
}

function buildDeletePlan(
  context: CompassTransitionContext,
): CompassOperationPlan {
  return createPlan(context, {
    provider: getProvider(context.event),
    compassMutation: "DELETE",
    googleEffect: context.event.isSomeday
      ? ({ type: "none" } as const)
      : ({
          type: "delete",
          deleteEventId: getGoogleDeleteEventId(context),
        } as const),
    operation: `${context.summary.category}_DELETED`,
    event: context.event,
    rrule: context.rrule,
    steps: [{ type: "delete_single", event: context.event }],
  });
}

function buildStandaloneToSomedayPlan(
  context: CompassTransitionContext,
): CompassOperationPlan {
  const event = {
    ...context.event,
    isSomeday: true,
  } as NormalizedCompassEvent;

  return createPlan(context, {
    provider: CalendarProvider.COMPASS,
    compassMutation: "CREATE",
    googleEffect: {
      type: "delete",
      deleteEventId: getGoogleDeleteEventId(context),
    },
    operation: `${context.summary.category}_UPDATED`,
    event,
    rrule: null,
    steps: [{ type: "create", event, rrule: null }],
  });
}

function buildSeriesToSomedayPlan(
  context: CompassTransitionContext,
): CompassOperationPlan {
  const event = {
    ...getSeriesEvent(context, CalendarProvider.COMPASS),
    isSomeday: true,
  } as NormalizedCompassEvent;

  return createPlan(context, {
    provider: CalendarProvider.COMPASS,
    compassMutation: "RECREATE_SERIES",
    googleEffect: {
      type: "delete",
      deleteEventId: getGoogleDeleteEventId(context),
    },
    operation: `${context.summary.category}_UPDATED`,
    event,
    rrule: context.rrule,
    steps: [
      {
        type: "delete_series",
        userId: context.event.user!,
        baseId: context.event._id.toString(),
        keepBase: true,
      },
      {
        type: "create",
        event,
        rrule: context.rrule,
      },
    ],
  });
}

function buildSeriesToStandalonePlan(
  context: CompassTransitionContext,
): CompassOperationPlan {
  return createPlan(context, {
    provider: getProvider(context.event),
    compassMutation: "UPDATE",
    googleEffect: context.event.isSomeday
      ? ({ type: "none" } as const)
      : ({ type: "update" } as const),
    operation: `${context.summary.category}_UPDATED`,
    event: context.event,
    rrule: null,
    steps: [
      {
        type: "delete_series",
        userId: context.event.user!,
        baseId: context.event._id.toString(),
        keepBase: true,
      },
      { type: "update", event: context.event },
    ],
    clearRecurrenceBeforeGoogleUpdate: !context.event.isSomeday,
  });
}

function buildStandaloneToSeriesPlan(
  context: CompassTransitionContext,
): CompassOperationPlan {
  return createPlan(context, {
    provider: getProvider(context.event),
    compassMutation: "CREATE",
    googleEffect: context.event.isSomeday
      ? ({ type: "none" } as const)
      : ({ type: "update" } as const),
    operation: `${context.summary.category}_UPDATED`,
    event: context.event,
    rrule: context.rrule,
    steps: [{ type: "create", event: context.event, rrule: context.rrule }],
  });
}

function buildUpdateSeriesPlan(
  context: CompassTransitionContext,
): CompassOperationPlan {
  const provider = getProvider(context.event);
  const event = getSeriesEvent(context, provider);
  const rruleDiff = context.rrule?.diffOptions(context.dbRrule!) ?? [];
  const isSeriesSplit = rruleDiff.length > 0;
  const isUntilOnlyChange =
    rruleDiff[0]?.[0] === "until" && rruleDiff.length === 1;

  if (isUntilOnlyChange) {
    return createPlan(context, {
      provider,
      compassMutation: "TRUNCATE_SERIES",
      googleEffect: context.event.isSomeday
        ? ({ type: "none" } as const)
        : ({ type: "update" } as const),
      operation: `${context.summary.category}_UPDATED`,
      event,
      rrule: context.rrule,
      steps: [
        {
          type: "delete_instances_after_until",
          userId: context.event.user!,
          baseId: context.event._id.toString(),
          until: context.rrule!.options.until!,
        },
        {
          type: "update_series",
          event,
        },
      ],
    });
  }

  if (isSeriesSplit) {
    return createPlan(context, {
      provider,
      compassMutation: "RECREATE_SERIES",
      googleEffect: context.event.isSomeday
        ? ({ type: "none" } as const)
        : ({ type: "update" } as const),
      operation: `${context.summary.category}_UPDATED`,
      event,
      rrule: context.rrule,
      steps: [
        {
          type: "delete_series",
          userId: context.event.user!,
          baseId: context.event._id.toString(),
          keepBase: true,
        },
        {
          type: "create",
          event,
          rrule: context.rrule,
        },
      ],
    });
  }

  return createPlan(context, {
    provider,
    compassMutation: "UPDATE_SERIES",
    googleEffect: context.event.isSomeday
      ? ({ type: "none" } as const)
      : ({ type: "update" } as const),
    operation: `${context.summary.category}_UPDATED`,
    event,
    rrule: context.rrule,
    steps: [{ type: "update_series", event }],
  });
}

function buildCancelSeriesPlan(
  context: CompassTransitionContext,
): CompassOperationPlan {
  return createPlan(context, {
    provider: getProvider(context.event),
    compassMutation: "DELETE",
    googleEffect: context.event.isSomeday
      ? ({ type: "none" } as const)
      : ({
          type: "delete",
          deleteEventId: getGoogleDeleteEventId(context),
        } as const),
    operation: `${context.summary.category}_DELETED`,
    event: context.event,
    rrule: context.rrule,
    steps: [
      {
        type: "delete_series",
        userId: context.event.user!,
        baseId: context.event._id.toString(),
        keepBase: false,
      },
    ],
  });
}

const PLAN_BUILDERS: Record<string, PlanBuilder> = {
  "NIL->>STANDALONE_SOMEDAY_CONFIRMED": buildCreatePlan,
  "NIL->>RECURRENCE_BASE_SOMEDAY_CONFIRMED": buildCreatePlan,
  "NIL->>STANDALONE_CONFIRMED": buildCreatePlan,
  "NIL->>RECURRENCE_BASE_CONFIRMED": buildCreatePlan,
  "STANDALONE_SOMEDAY->>STANDALONE_CONFIRMED": buildCreatePlan,
  "RECURRENCE_BASE_SOMEDAY->>RECURRENCE_BASE_CONFIRMED": buildCreatePlan,
  "RECURRENCE_INSTANCE_SOMEDAY->>STANDALONE_CONFIRMED": buildCreatePlan,
  "STANDALONE_SOMEDAY->>STANDALONE_SOMEDAY_CONFIRMED": buildUpdatePlan,
  "STANDALONE->>STANDALONE_CONFIRMED": buildUpdatePlan,
  "RECURRENCE_INSTANCE_SOMEDAY->>RECURRENCE_INSTANCE_SOMEDAY_CONFIRMED":
    buildUpdatePlan,
  "RECURRENCE_INSTANCE->>RECURRENCE_INSTANCE_CONFIRMED": buildUpdatePlan,
  "NIL->>STANDALONE_SOMEDAY_CANCELLED": buildDeletePlan,
  "NIL->>STANDALONE_CANCELLED": buildDeletePlan,
  "NIL->>RECURRENCE_INSTANCE_CANCELLED": buildDeletePlan,
  "NIL->>RECURRENCE_INSTANCE_SOMEDAY_CANCELLED": buildDeletePlan,
  "STANDALONE_SOMEDAY->>STANDALONE_SOMEDAY_CANCELLED": buildDeletePlan,
  "STANDALONE->>STANDALONE_CANCELLED": buildDeletePlan,
  "RECURRENCE_INSTANCE->>RECURRENCE_INSTANCE_CANCELLED": buildDeletePlan,
  "RECURRENCE_INSTANCE_SOMEDAY->>RECURRENCE_INSTANCE_SOMEDAY_CANCELLED":
    buildDeletePlan,
  "STANDALONE->>STANDALONE_SOMEDAY_CONFIRMED": buildStandaloneToSomedayPlan,
  "RECURRENCE_BASE->>RECURRENCE_BASE_SOMEDAY_CONFIRMED":
    buildSeriesToSomedayPlan,
  "RECURRENCE_BASE_SOMEDAY->>STANDALONE_SOMEDAY_CONFIRMED":
    buildSeriesToStandalonePlan,
  "RECURRENCE_BASE->>STANDALONE_CONFIRMED": buildSeriesToStandalonePlan,
  "STANDALONE_SOMEDAY->>RECURRENCE_BASE_SOMEDAY_CONFIRMED":
    buildStandaloneToSeriesPlan,
  "STANDALONE->>RECURRENCE_BASE_CONFIRMED": buildStandaloneToSeriesPlan,
  "RECURRENCE_BASE->>RECURRENCE_BASE_CONFIRMED": buildUpdateSeriesPlan,
  "RECURRENCE_BASE_SOMEDAY->>RECURRENCE_BASE_SOMEDAY_CONFIRMED":
    buildUpdateSeriesPlan,
  "NIL->>RECURRENCE_BASE_SOMEDAY_CANCELLED": buildCancelSeriesPlan,
  "NIL->>RECURRENCE_BASE_CANCELLED": buildCancelSeriesPlan,
  "RECURRENCE_BASE_SOMEDAY->>RECURRENCE_BASE_SOMEDAY_CANCELLED":
    buildCancelSeriesPlan,
  "RECURRENCE_BASE->>RECURRENCE_BASE_CANCELLED": buildCancelSeriesPlan,
};

export function buildCompassTransitionContext(
  eventInput: CompassEvent,
  dbEvent: WithId<Omit<Schema_Event, "_id">> | null,
): CompassTransitionContext {
  const event = normalizeCompassEvent(eventInput);
  const status: TransitionStatus = eventInput.status;
  const isEventInstance = isInstance(event);
  const isEventBase = isBase(event as Omit<Schema_Event, "_id">);
  const isEventStandalone = isRegularEvent(event);
  const isDatabaseInstance = dbEvent ? isInstance(dbEvent) : false;
  const isDatabaseBase = dbEvent ? isBase(dbEvent) : false;
  const isDatabaseStandalone = dbEvent ? isRegularEvent(dbEvent) : false;
  const eventCategory = getCategory(event, {
    isStandalone: isEventStandalone,
    isBase: isEventBase,
    isInstance: isEventInstance,
  });
  const dbCategory = getDbCategory(dbEvent, {
    isDbStandalone: isDatabaseStandalone,
    isDbBase: isDatabaseBase,
    isDbInstance: isDatabaseInstance,
  });
  const rrule = isEventBase
    ? new CompassEventRRule(
        event as WithId<Omit<Schema_Event_Recur_Base, "_id">>,
      )
    : null;
  const dbRrule = isDatabaseBase
    ? new CompassEventRRule(
        dbEvent as WithId<Omit<Schema_Event_Recur_Base, "_id">>,
      )
    : null;
  const transition: CompassTransitionContext["transition"] = [
    dbCategory,
    `${eventCategory}_${status}`,
  ];
  const summaryCategory = dbCategory ?? eventCategory;
  const transitionKey =
    `${dbCategory ?? "NIL"}->>${transition[1]}` as CompassTransitionKey;

  return {
    event,
    dbEvent,
    eventCategory,
    dbCategory,
    transition,
    transitionKey,
    summary: {
      title: event.title ?? event._id.toString() ?? "unknown",
      transition,
      category: summaryCategory,
    },
    isBase: isEventBase,
    isInstance: isEventInstance,
    isStandalone: isEventStandalone,
    isDbBase: isDatabaseBase,
    isDbInstance: isDatabaseInstance,
    isDbStandalone: isDatabaseStandalone,
    rrule,
    dbRrule,
  };
}

export function analyzeCompassTransition(
  event: CompassEvent,
  dbEvent: WithId<Omit<Schema_Event, "_id">> | null,
): CompassOperationPlan {
  const context = buildCompassTransitionContext(event, dbEvent);
  const builder = PLAN_BUILDERS[context.transitionKey];

  if (!builder) {
    throw error(
      GenericError.DeveloperError,
      `Compass event handler failed: ${context.transitionKey}`,
    );
  }

  return builder(context);
}
