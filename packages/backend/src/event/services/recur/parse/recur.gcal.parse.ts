import { gSchema$Event } from "@core/types/gcal";
import { GenericError } from "@backend/common/errors/generic/generic.errors";
import { error } from "@backend/common/errors/handlers/error.handler";
import { categorizeGcalEvents } from "@backend/common/services/gcal/gcal.utils";

type SeriesAction =
  | "CREATE_SERIES" // New recurring event
  | "UPDATE_SERIES" // Series modification (could be split or update)
  | "UPDATE_INSTANCE" // Single instance update
  | "DELETE_SERIES" // Delete entire series
  | "DELETE_INSTANCES"; // Delete one or more instances

export interface ActionAnalysis {
  action: SeriesAction;
  baseEvent?: gSchema$Event;
  modifiedInstance?: gSchema$Event;
  newBaseEvent?: gSchema$Event;
  endDate?: string;
  hasInstances?: boolean;
}

/**
 * Analyzes an array of events from Google Calendar to determine the next action needed
 * to sync the database with Google Calendar's state.
 */
export function determineNextAction(events: gSchema$Event[]): ActionAnalysis {
  const parser = new GCalParser(events);
  const action = parser.determineNextAction();
  return action;
}

class GCalParser {
  private baseEvent: gSchema$Event | undefined;
  private instances: gSchema$Event[];
  private events: gSchema$Event[];
  private cancelledEvents: gSchema$Event[];

  constructor(events: gSchema$Event[]) {
    this.events = events;
    const { baseEvent, instances, cancelledEvents } =
      this.categorizeEvents(events);
    this.baseEvent = baseEvent;
    this.instances = instances;
    this.cancelledEvents = cancelledEvents;
  }

  private categorizeEvents = (events: gSchema$Event[]) => {
    if (!events || events.length === 0) {
      throw error(
        GenericError.DeveloperError,
        "Next action not determine because no events provided",
      );
    }
    return categorizeGcalEvents(events);
  };

  public determineNextAction = (): ActionAnalysis => {
    // Reminder: the order of these checks is important
    if (this.isCreatingSeries()) {
      return {
        action: "CREATE_SERIES",
        baseEvent: this.baseEvent,
      };
    }
    if (this.isDeletingSeries()) {
      return {
        action: "DELETE_SERIES",
      };
    }

    if (this.isDeletingInstances()) {
      return {
        action: "DELETE_INSTANCES",
        baseEvent: this.baseEvent,
        modifiedInstance: this.cancelledEvents[0],
      };
    }

    const { isUpdatingSeries, newBaseEvent } = this.isUpdatingSeries();
    if (isUpdatingSeries) {
      const endDate = this.baseEvent?.recurrence
        ?.find((rule) => rule.includes("UNTIL"))
        ?.split("=")[1];

      return {
        action: "UPDATE_SERIES",
        baseEvent: this.baseEvent,
        newBaseEvent,
        endDate,
        hasInstances: this.instances.length > 0,
      };
    }

    if (this.isUpdatingInstance()) {
      return {
        action: "UPDATE_INSTANCE",
        baseEvent: this.baseEvent,
        modifiedInstance: this.instances[0],
      };
    }

    throw error(
      GenericError.DeveloperError,
      "Event not inferred because not all cases were handled",
    );
  };

  private isCreatingSeries = () => {
    // If we have a single event with recurrence and no instances, it's a new series
    const answer =
      this.events.length === 1 &&
      this.baseEvent?.recurrence &&
      !this.baseEvent.recurringEventId;
    return !!answer;
  };

  private isDeletingInstances = () => {
    // If we have a base event and cancelled instances,
    const answer = this.baseEvent && this.cancelledEvents.length > 0;
    return !!answer;
  };

  private isDeletingSeries = () => {
    // If we have no base event and all events are cancelled instances,
    // it's a series deletion
    const answer =
      !this.baseEvent && this.cancelledEvents.length === this.events.length;
    return answer;
  };

  private isUpdatingInstance = () => {
    // If we have instances that point to the base event, it's an instance update
    const answer =
      this.baseEvent &&
      this.instances.length > 0 &&
      this.instances.every(
        (instance) => instance.recurringEventId === this.baseEvent?.id,
      );
    return !!answer;
  };

  private isUpdatingSeries = () => {
    // If we have a base event with UNTIL rule and no cancelled instances,
    // it's a series modification
    const hasUntil = this.baseEvent?.recurrence?.some((rule) =>
      rule.includes("UNTIL"),
    );
    if (!hasUntil) {
      return { isUpdatingSeries: false };
    }
    // Find the new base event - it should have recurrence but no UNTIL
    const newBaseEvent = this.events.find(
      (event) =>
        event.recurrence &&
        !event.recurringEventId &&
        event.id !== this.baseEvent?.id &&
        !event.recurrence.some((rule) => rule.includes("UNTIL")),
    );

    if (newBaseEvent) {
      return { isUpdatingSeries: true, newBaseEvent };
    }

    return { isUpdatingSeries: false };
  };
}
