import { gSchema$Event, gParamsEventsList, gCalendar } from "@core/types/gcal";
import { GCAL_NOTIFICATION_ENDPOINT } from "@core/constants/core.constants";
import { Params_WatchEvents } from "@core/types/sync.types";
import { ENV } from "@backend/common/constants/env.constants";
import { GCAL_PRIMARY } from "@backend/common/constants/backend.constants";
import { GcalError } from "@backend/common/constants/error.constants";
import { error } from "@backend/common/errors/handlers/error.handler";

class GCalService {
  async createEvent(gcal: gCalendar, event: gSchema$Event) {
    const response = await gcal.events.insert({
      calendarId: "primary",
      requestBody: event,
    });

    return response.data;
  }

  async deleteEvent(gcal: gCalendar, gcalEventId: string) {
    const response = await gcal.events.delete({
      calendarId: GCAL_PRIMARY,
      eventId: gcalEventId,
      sendUpdates: "all",
    });
    return response;
  }

  async getEvents(gcal: gCalendar, params: gParamsEventsList) {
    const response = await gcal.events.list(params);
    return response;
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
    const response = await gcal.events.update({
      calendarId: GCAL_PRIMARY,
      eventId: gEventId,
      requestBody: event,
    });
    return response.data;
  }

  watchEvents = async (gcal: gCalendar, params: Params_WatchEvents) => {
    const { data } = await gcal.events.watch({
      calendarId: params.gCalendarId,
      requestBody: {
        // reminder: address always needs to be HTTPS
        address: (ENV.BASEURL as string) + GCAL_NOTIFICATION_ENDPOINT,
        expiration: params.expiration,
        id: params.channelId,
        token: ENV.TOKEN_GCAL_NOTIFICATION,
        type: "web_hook",
      },
      syncToken: params.nextSyncToken,
    });

    return { watch: data };
  };
}

export default new GCalService();
