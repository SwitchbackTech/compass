import { calendar_v3 } from "googleapis";

import { Logger } from "../logger/common.logger";
import { gParamsEventsList, gSchema$Event } from "../../../declarations";
import { GCAL_PRIMARY } from "../constants/backend.constants";
import { BaseError } from "../errors/errors.base";
import { Status } from "../errors/status.codes";

const logger = Logger("app:compass.gcal.service");

class GCalService {
  async createEvent(gcal: calendar_v3.Calendar, event: gSchema$Event) {
    const response = await gcal.events.insert({
      calendarId: "primary",
      requestBody: event,
    });
    return response.data;
  }

  async deleteEvent(
    gcal: calendar_v3.Calendar,
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

  async getEvents(gcal: calendar_v3.Calendar, params: gParamsEventsList) {
    const response = await gcal.events.list(params);
    return response;
  }

  async updateEvent(
    gcal: calendar_v3.Calendar,
    gEventId: string,
    event: gSchema$Event
  ) {
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
