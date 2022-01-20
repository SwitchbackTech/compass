import { gSchema$Event, gParamsEventsList, gCalendar } from "declarations";

import { BaseError } from "@core/errors/errors.base";
import { Status } from "@core/errors/status.codes";

import { Logger } from "@backend/common/logger/common.logger";
import { GCAL_PRIMARY } from "@backend/common/constants/backend.constants";

const logger = Logger("app:compass.gcal.service");

class GCalService {
  async createEvent(gcal: gCalendar, event: gSchema$Event) {
    const response = await gcal.events.insert({
      calendarId: "primary",
      requestBody: event,
    });

    if (response.data.status !== "confirmed") {
      logger.warning("The gcal event might be invalid");
    }

    return response.data;
  }

  async deleteEvent(
    gcal: gCalendar,
    gcalEventId: string
  ): Promise<void | BaseError> {
    try {
      const response = await gcal.events.delete({
        calendarId: GCAL_PRIMARY,
        eventId: gcalEventId,
        sendUpdates: "all",
      });
    } catch (e) {
      if (e.response.status === 410) {
        // If the resource is `gone` [status code 410] just ignore
        logger.warn(
          `GCal Event was deleted before this request: ${gcalEventId}`
        );
      } else {
        return new BaseError(
          "GCal Delete Failed",
          "Failed to delete event in gcal",
          Status.BAD_REQUEST,
          true
        );
      }
    }
  }

  async getEvents(gcal: gCalendar, params: gParamsEventsList) {
    const response = await gcal.events.list(params);
    return response;
  }

  async listCalendars(gcal: gCalendar) {
    try {
      const response = await gcal.calendarList.list();
      return response.data;
    } catch (e) {
      return new BaseError("GCal Calendar List Failed", e, Status.UNSURE, true);
    }
  }

  async updateEvent(gcal: gCalendar, gEventId: string, event: gSchema$Event) {
    try {
      const response = await gcal.events.update({
        calendarId: GCAL_PRIMARY,
        eventId: gEventId,
        requestBody: event,
      });
      return response.data;
    } catch (e) {
      return new BaseError("GCal Update Failed", e, Status.BAD_REQUEST, true);
    }
  }
}

export default new GCalService();
