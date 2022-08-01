//@ts-nocheck
import { gSchema$Event, gParamsEventsList, gCalendar } from "@core/types/gcal";
import { GCAL_NOTIFICATION_URL } from "@backend/common/constants/backend.constants";
import { ENV } from "@backend/common/constants/env.constants";
import { BaseError } from "@core/errors/errors.base";
import { Status } from "@core/errors/status.codes";
import { Logger } from "@core/logger/winston.logger";
import { GCAL_PRIMARY } from "@backend/common/constants/backend.constants";

const logger = Logger("app:compass.gcal.service");

export const FAILED_GCALLIST = "";

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

  async getCalendarlist(gcal: gCalendar) {
    const response = await gcal.calendarList.list();
    return response.data;
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

  watchEvents = async (
    gcal: gCalendar,
    gCalendarId: string,
    channelId: string,
    expiration: string
  ) => {
    const { data } = await gcal.events.watch({
      calendarId: gCalendarId,
      requestBody: {
        id: channelId,
        // uses prod URL because address always needs to be HTTPS
        // TODO: once dedicated e2e test VM, use that instead of prod
        address: `${ENV.BASEURL_PROD}${GCAL_NOTIFICATION_URL}`,
        type: "web_hook",
        expiration,
      },
    });
    return { watch: data };
  };
}

export default new GCalService();
