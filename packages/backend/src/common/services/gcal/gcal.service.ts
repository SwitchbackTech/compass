import { GaxiosError } from "gaxios";
import { gSchema$Event, gParamsEventsList, gCalendar } from "@core/types/gcal";
import { GCAL_NOTIFICATION_ENDPOINT } from "@core/constants/core.constants";
import { ENV } from "@backend/common/constants/env.constants";
import {
  GCAL_PRIMARY,
  GCAL_NOTIFICATION_TOKEN,
} from "@backend/common/constants/backend.constants";

import { handleGcalError } from "./gcal.utils";

class GCalService {
  async createEvent(gcal: gCalendar, event: gSchema$Event) {
    try {
      const response = await gcal.events.insert({
        calendarId: "primary",
        requestBody: event,
      });

      return response.data;
    } catch (e) {
      handleGcalError("Failed to CreategEvent", e as GaxiosError);
      return;
    }
  }

  async deleteEvent(gcal: gCalendar, gcalEventId: string) {
    try {
      const response = await gcal.events.delete({
        calendarId: GCAL_PRIMARY,
        eventId: gcalEventId,
        sendUpdates: "all",
      });
      return response;
    } catch (e) {
      handleGcalError("Failed to Delete gEvent", e as GaxiosError);
      return;
    }
  }

  async getEvents(gcal: gCalendar, params: gParamsEventsList) {
    try {
      const response = await gcal.events.list(params);
      return response;
    } catch (e) {
      handleGcalError("Failed to Get gEvent", e as GaxiosError);
      return;
    }
  }

  async getCalendarlist(gcal: gCalendar) {
    try {
      const response = await gcal.calendarList.list();
      return response.data;
    } catch (e) {
      handleGcalError("Failed to Get gCalendarList", e as GaxiosError);
      return;
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
      handleGcalError("Failed to Update gEvent", e as GaxiosError);
      return;
    }
  }

  watchEvents = async (
    gcal: gCalendar,
    gCalendarId: string,
    channelId: string,
    expiration: string
  ) => {
    try {
      const { data } = await gcal.events.watch({
        calendarId: gCalendarId,
        requestBody: {
          // uses prod URL because address always needs to be HTTPS
          // TODO: once dedicated e2e test VM, use that instead of prod
          address: `${ENV.BASEURL_PROD}${GCAL_NOTIFICATION_ENDPOINT}`,
          expiration,
          id: channelId,
          token: GCAL_NOTIFICATION_TOKEN,
          type: "web_hook",
        },
      });
      return { watch: data };
    } catch (e) {
      handleGcalError("Failed to Watch for Events", e as GaxiosError);
      return;
    }
  };
}

export default new GCalService();
