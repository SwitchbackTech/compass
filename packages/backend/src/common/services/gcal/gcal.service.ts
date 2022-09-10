import { GaxiosError } from "gaxios";
import { gSchema$Event, gParamsEventsList, gCalendar } from "@core/types/gcal";
import { GCAL_NOTIFICATION_ENDPOINT } from "@core/constants/core.constants";
import { ENV } from "@backend/common/constants/env.constants";
import {
  GCAL_PRIMARY,
  GCAL_NOTIFICATION_TOKEN,
} from "@backend/common/constants/backend.constants";
import { error, GcalError } from "@backend/common/errors/types/backend.errors";

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
      return handleGcalError("Failed to Create gEvent", e as GaxiosError);
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
    const response = await gcal.calendarList.list();

    if (!response.data.nextSyncToken) {
      throw error(
        GcalError.PaginationNotSupported,
        "Calendarlist sync token not saved"
      );
    }

    if (!response.data.items) {
      throw error(GcalError.CalendarlistMissing, "gCalendarlist not found");
    }
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
      handleGcalError("Failed to Update gEvent", e as GaxiosError);
      return;
    }
  }

  watchEvents = async (
    gcal: gCalendar,
    params: {
      gCalendarId: string;
      channelId: string;
      expiration: string;
      nextSyncToken?: string;
    }
  ) => {
    try {
      const { data } = await gcal.events.watch({
        calendarId: params.gCalendarId,
        requestBody: {
          // reminder: address always needs to be HTTPS
          address: ENV.BASEURL + GCAL_NOTIFICATION_ENDPOINT,
          expiration: params.expiration,
          id: params.channelId,
          token: GCAL_NOTIFICATION_TOKEN,
          type: "web_hook",
        },
        syncToken: params.nextSyncToken,
      });

      return { watch: data };
    } catch (e) {
      return handleGcalError("Failed to Watch for Events", e as GaxiosError);
      // return { error: e };
    }
  };
}

export default new GCalService();
