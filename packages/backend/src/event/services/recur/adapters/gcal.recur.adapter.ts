import { Origin } from "@core/constants/core.constants";
import { MapEvent } from "@core/mappers/map.event";
import {
  Schema_Event_Recur_Base,
  Schema_Event_Recur_Instance,
} from "@core/types/event.types";
import { gCalendar, gSchema$Event } from "@core/types/gcal";
import { RecurringEventManager } from "../manager/recur.manager";
import { determineNextAction } from "../parse/recur.gcal.parse";
import { GCalRecurringEventProvider } from "../providers/gcal/gcal.recur.provider";
import {
  Summary_SeriesChange_Compass,
  Summary_SeriesChange_Gcal,
} from "../recur.types";

/**
 * Adapter that handles converting Google Calendar data to our schemas
 */
export class GCalRecurringEventAdapter {
  private manager: RecurringEventManager;
  private provider: GCalRecurringEventProvider;
  private userId: string;

  constructor(userId: string, gcal: gCalendar) {
    this.userId = userId;
    this.provider = new GCalRecurringEventProvider(gcal);
    this.manager = new RecurringEventManager(this.provider);
  }

  /**
   * Process Google Calendar events to determine and execute the appropriate action
   * @param events Google Calendar events to process
   */
  async processEvents(events: gSchema$Event[]): Promise<void> {
    // 1. Determine the action to take
    const actionAnalysis = determineNextAction(events);

    // 2. Convert Google Calendar events to Schema_Event objects
    const schemaEvents = this.mapActionAnalysisToEvents(actionAnalysis);

    // 3. Create input for the RecurringEventManager
    const input: Summary_SeriesChange_Compass = {
      action: actionAnalysis.action,
      ...schemaEvents,
      deleteFrom: actionAnalysis.deleteFrom,
    };

    // 4. Process the action
    await this.manager.handleAction(input);
  }

  /**
   * Maps Google Calendar action analysis to Schema_Event objects
   */
  private mapActionAnalysisToEvents(actionAnalysis: Summary_SeriesChange_Gcal) {
    const result: {
      baseEvent?: Schema_Event_Recur_Base;
      newBaseEvent?: Schema_Event_Recur_Base;
      modifiedInstance?: Schema_Event_Recur_Instance;
    } = {};

    // Map base event if it exists
    if (actionAnalysis.baseEvent) {
      result.baseEvent = MapEvent.toCompass(
        this.userId,
        [actionAnalysis.baseEvent],
        Origin.GOOGLE_IMPORT,
      )[0] as Schema_Event_Recur_Base;
    }

    // Map new base event if it exists
    if (actionAnalysis.newBaseEvent) {
      result.newBaseEvent = MapEvent.toCompass(
        this.userId,
        [actionAnalysis.newBaseEvent],
        Origin.GOOGLE_IMPORT,
      )[0] as Schema_Event_Recur_Base;
    }

    // Map modified instance if it exists
    if (actionAnalysis.modifiedInstance) {
      result.modifiedInstance = MapEvent.toCompass(
        this.userId,
        [actionAnalysis.modifiedInstance],
        Origin.GOOGLE_IMPORT,
      )[0] as Schema_Event_Recur_Instance;
    }

    return result;
  }
}
