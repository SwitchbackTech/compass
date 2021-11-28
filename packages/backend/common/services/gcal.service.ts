import { calendar_v3 } from "googleapis";

import { Logger } from "../../common/logger/common.logger";
import { gParamsEventsList, gSchema$Event } from "../../declarations";
import { GCAL_PRIMARY } from "../constants/common";
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
  /*

  async watch(state: string) {
    logger.warn("Watching (not really) ...");
    const calendar = google.calendar({
      version: "v3",
      auth: this.oAuth2Client,
    });
    //TODO replace with env
    let response = await calendar.events.watch({
      calendarId: "primary",
      resource: {
        id: state,
        address: "https://***REMOVED***/app/notifications",
        type: "web_hook",
      },
    });
    logger.debug("Watching =>", response);
    logger.debug("reminder: address is hardcoded");
    return ''
  }

  async stop(state, resourceId) {
    const calendar = google.calendar({
      version: "v3",
      auth: this.oAuth2Client,
    });
    let response = await calendar.channels.stop({
      resource: {
        id: state,
        resourceId: resourceId,
      },
    });
    console.log("Stop =>", state);
  }
  */
}

export default new GCalService();
