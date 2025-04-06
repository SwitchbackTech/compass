import { Origin } from "@core/constants/core.constants";
import { MapEvent } from "@core/mappers/map.event";
import {
  Schema_Event_Recur_Base,
  Schema_Event_Recur_Instance,
} from "@core/types/event.types";
import {
  Summary_SeriesChange_Compass,
  Summary_SeriesChange_Gcal,
} from "../recurrence.types";

/**
 * Mapper that handles converting Google Calendar data to our schemas
 */
export class GCalRecurringEventMapper {
  private userId: string;
  private actionAnalysis: Summary_SeriesChange_Gcal;

  constructor(userId: string, actionAnalysis: Summary_SeriesChange_Gcal) {
    this.userId = userId;
    this.actionAnalysis = actionAnalysis;
  }

  /**
   * Infer changes from Google Calendar events
   */
  mapChangesFromGcalToCompass(): Summary_SeriesChange_Compass {
    const events = this.mapGcalChangesToCompassChanges();
    const changes = {
      action: this.actionAnalysis.action,
      ...events,
    };

    console.log("++ compassChanges (returning these from mapper):");
    console.log(JSON.stringify(changes));
    return changes;
  }

  /**
   * Maps Google Calendar changes to Compass changes
   */
  private mapGcalChangesToCompassChanges() {
    const result: {
      baseEvent?: Schema_Event_Recur_Base;
      newBaseEvent?: Schema_Event_Recur_Base;
      modifiedInstance?: Schema_Event_Recur_Instance;
    } = {};

    // Map base event if it exists
    if (this.actionAnalysis.baseEvent) {
      result.baseEvent = MapEvent.toCompass(
        this.userId,
        [this.actionAnalysis.baseEvent],
        Origin.GOOGLE_IMPORT,
      )[0] as Schema_Event_Recur_Base;
    }

    // Map new base event if it exists
    if (this.actionAnalysis.newBaseEvent) {
      result.newBaseEvent = MapEvent.toCompass(
        this.userId,
        [this.actionAnalysis.newBaseEvent],
        Origin.GOOGLE_IMPORT,
      )[0] as Schema_Event_Recur_Base;
    }

    // Map modified instance if it exists
    if (this.actionAnalysis.modifiedInstance) {
      result.modifiedInstance = MapEvent.toCompass(
        this.userId,
        [this.actionAnalysis.modifiedInstance],
        Origin.GOOGLE_IMPORT,
      )[0] as Schema_Event_Recur_Instance;
    }

    return result;
  }
}
