import { calendar_v3 } from "googleapis";

import { BASEURL } from "@core/core.constants";

import { Logger } from "../logger/common.logger";
import { gParamsEventsList, gSchema$Event } from "../../../declarations";
import {
  GCAL_NOTIFICATION_URL,
  GCAL_PRIMARY,
} from "../constants/backend.constants";
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
  async stopWatching(
    gcal: calendar_v3.Calendar,
    state: string,
    resourceId: string
  ) {
    const response = await gcal.channels.stop({
      requestBody: {
        id: state,
        resourceId: resourceId,
      },
    });
    console.log("Stop =>", state);
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
  Setup the notification channel for a user's calendar,
  telling google where to notify us when an event changes
  */
  async watchCalendar(
    gcal: calendar_v3.Calendar,
    calendarId: string,
    channelId: string
  ) {
    logger.info(`Setting up watch for calendarId: ${calendarId}`);
    try {
      const response = await gcal.events.watch({
        calendarId: calendarId,
        requestBody: {
          id: channelId,
          address: `${BASEURL}${GCAL_NOTIFICATION_URL}`,
          type: "web_hook",
        },
      });
      logger.debug("Watching =>", response);
      logger.debug("reminder: address is hardcoded");
      return response;
    } catch (e) {
      if (e.code && e.code === 400) {
        const msg = {
          errors: [{ ignored: `We're already watching channel: ${channelId}` }],
        };
        return msg;
      } else {
        logger.error(e);
      }
    }
  }
}

export default new GCalService();
