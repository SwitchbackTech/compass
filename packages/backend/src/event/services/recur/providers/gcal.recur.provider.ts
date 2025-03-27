import dayjs from "dayjs";
import { Origin } from "@core/constants/core.constants";
import { MapEvent } from "@core/mappers/map.event";
import { Schema_Event } from "@core/types/event.types";
import { gCalendar } from "@core/types/gcal";
import gcalService from "@backend/common/services/gcal/gcal.service";
import { Summary_SeriesChange_Gcal } from "../recur.types";
import { RecurringEventProvider } from "./recur.provider.interface";

/**
 * Google Calendar specific implementation for expanding recurring events
 */
export class GCalRecurringEventProvider implements RecurringEventProvider {
  constructor(
    private userId: string,
    private calendarId: string,
    private gcal: gCalendar,
  ) {}

  /**
   * Maps Google Calendar action analysis to Schema_Event objects
   */
  mapActionAnalysisToEvents(actionAnalysis: Summary_SeriesChange_Gcal): {
    baseEvent?: Schema_Event;
    newBaseEvent?: Schema_Event;
    modifiedInstance?: Schema_Event;
  } {
    const result: {
      baseEvent?: Schema_Event;
      newBaseEvent?: Schema_Event;
      modifiedInstance?: Schema_Event;
    } = {};

    // Map base event if it exists
    if (actionAnalysis.baseEvent) {
      result.baseEvent = MapEvent.toCompass(
        this.userId,
        [actionAnalysis.baseEvent],
        Origin.GOOGLE_IMPORT,
      )[0];
    }

    // Map new base event if it exists
    if (actionAnalysis.newBaseEvent) {
      result.newBaseEvent = MapEvent.toCompass(
        this.userId,
        [actionAnalysis.newBaseEvent],
        Origin.GOOGLE_IMPORT,
      )[0];
    }

    // Map modified instance if it exists
    if (actionAnalysis.modifiedInstance) {
      result.modifiedInstance = MapEvent.toCompass(
        this.userId,
        [actionAnalysis.modifiedInstance],
        Origin.GOOGLE_IMPORT,
      )[0];
    }

    return result;
  }

  /**
   * Expands a recurring event into its instances using Google Calendar API
   */
  async expandRecurringEvent(baseEvent: Schema_Event): Promise<Schema_Event[]> {
    if (!baseEvent.gEventId || !baseEvent.recurrence?.eventId) {
      return [];
    }

    const timeMin = new Date().toISOString();
    const timeMax = dayjs().add(6, "months").toISOString();

    try {
      const { data } = await gcalService.getEventInstances(
        this.gcal,
        this.calendarId,
        baseEvent.gEventId,
        timeMin,
        timeMax,
      );

      if (!data || !data.items) {
        return [];
      }

      // Map Google Calendar instances to Schema_Event
      return MapEvent.toCompass(this.userId, data.items, Origin.GOOGLE_IMPORT);
    } catch (err) {
      console.error("Error fetching recurring event instances:", err);
      return [];
    }
  }
}
