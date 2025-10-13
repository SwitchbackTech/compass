import type { GaxiosResponse } from "gaxios";
import { GCAL_NOTIFICATION_ENDPOINT } from "@core/constants/core.constants";
import type {
  gCalendar,
  gParamsEventsList,
  gSchema$Event,
  gSchema$Events,
} from "@core/types/gcal";
import type { Params_WatchEvents } from "@core/types/sync.types";
import { GCAL_PRIMARY } from "@backend/common/constants/backend.constants";
import { ENV } from "@backend/common/constants/env.constants";
import { error } from "@backend/common/errors/handlers/error.handler";
import { GcalError } from "@backend/common/errors/integration/gcal/gcal.errors";
import { getBaseURL } from "@backend/servers/ngrok/ngrok.utils";

class GCalService {
  private validateGCalResponse<T>(
    response: GaxiosResponse<T>,
    message = "Gcal request failed.",
  ) {
    const { status, statusText } = response;

    if (status !== 200 || statusText !== "OK") {
      throw error(GcalError.Unsure, message);
    }

    return response;
  }

  async getEvent(
    gcal: gCalendar,
    gcalEventId: string,
    calendarId = GCAL_PRIMARY,
  ) {
    const response = await gcal.events.get({
      calendarId,
      eventId: gcalEventId,
    });

    return response.data;
  }

  async createEvent(gcal: gCalendar, event: gSchema$Event) {
    const response = await gcal.events.insert({
      calendarId: GCAL_PRIMARY,
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

  private async getEventInstances(
    gcal: gCalendar,
    calendarId: string,
    eventId: string,
    timeMin?: string,
    timeMax?: string,
    pageToken?: string,
    maxResults?: number,
  ) {
    const response = await gcal.events.instances({
      calendarId,
      eventId,
      timeMin,
      timeMax,
      pageToken,
      maxResults,
    });
    return response;
  }

  async getEvents(gcal: gCalendar, params: gParamsEventsList) {
    const response = await gcal.events.list(params);
    return response;
  }

  async *getBaseRecurringEventInstances({
    gCal,
    calendarId,
    eventId,
    maxResults = 1000,
    timeMin,
    timeMax,
    pageToken,
  }: {
    gCal: gCalendar;
    calendarId: string;
    eventId: string;
    maxResults?: number;
    timeMin?: string;
    timeMax?: string;
    pageToken?: string;
  }): AsyncGenerator<
    Pick<gSchema$Events, "nextPageToken" | "nextSyncToken" | "items">
  > {
    let hasNextPage = false;

    do {
      const { data = {} } = await this.getEventInstances(
        gCal,
        calendarId,
        eventId,
        timeMin,
        timeMax,
        pageToken,
        maxResults,
      ).then((res) =>
        this.validateGCalResponse(
          res,
          `Failed to fetch gcal instances for base event ${eventId}`,
        ),
      );

      const { nextPageToken, nextSyncToken, items = [] } = data;

      pageToken = nextPageToken === null ? undefined : nextPageToken;

      hasNextPage =
        typeof nextPageToken === "string" && nextPageToken.length > 0;

      yield { nextPageToken, nextSyncToken, items };
    } while (hasNextPage);
  }

  /**
   * getAllEvents
   * generator function to list all google calendar events
   */
  async *getAllEvents({
    gCal,
    calendarId,
    maxResults = 1000,
    singleEvents = false,
    pageToken,
    syncToken,
  }: {
    gCal: gCalendar;
    calendarId: string;
    maxResults?: number;
    singleEvents?: boolean;
    pageToken?: string;
    syncToken?: string;
  }): AsyncGenerator<
    Pick<gSchema$Events, "nextPageToken" | "nextSyncToken" | "items">
  > {
    let hasNextPage = false;
    let isLastPage = true;

    do {
      const { data = {} } = await this.getEvents(gCal, {
        calendarId,
        singleEvents,
        maxResults,
        pageToken,
        syncToken,
      }).then((res) =>
        this.validateGCalResponse(res, `Failed to fetch gcal events`),
      );

      const { nextPageToken, nextSyncToken, items = [] } = data;

      pageToken = nextPageToken === null ? undefined : nextPageToken;
      syncToken = nextSyncToken === null ? undefined : nextSyncToken;

      hasNextPage =
        typeof nextPageToken === "string" && nextPageToken.length > 0;

      isLastPage =
        typeof nextSyncToken === "string" && nextSyncToken.length > 0;

      yield { nextPageToken, nextSyncToken, items };
    } while (hasNextPage || !isLastPage);
  }

  async getCalendarlist(gcal: gCalendar) {
    const response = await gcal.calendarList.list();

    if (!response.data.nextSyncToken) {
      throw error(
        GcalError.PaginationNotSupported,
        "Calendarlist sync token not saved",
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

  watchCalendars = async (
    gcal: gCalendar,
    params: Omit<Params_WatchEvents, "gCalendarId">,
  ) => {
    const { data } = await gcal.calendarList.watch({
      syncToken: params.nextSyncToken,
      requestBody: {
        // reminder: address always needs to be HTTPS
        address: getBaseURL() + GCAL_NOTIFICATION_ENDPOINT,
        expiration: params.expiration,
        id: `${params.channelId}_calendars`,
        token: ENV.TOKEN_GCAL_NOTIFICATION,
        type: "web_hook",
      },
    });

    return { watch: data };
  };

  watchEvents = async (gcal: gCalendar, params: Params_WatchEvents) => {
    const { data } = await gcal.events.watch({
      calendarId: params.gCalendarId,
      requestBody: {
        // reminder: address always needs to be HTTPS
        address: getBaseURL() + GCAL_NOTIFICATION_ENDPOINT,
        expiration: params.expiration,
        id: `${params.channelId}_events`,
        token: ENV.TOKEN_GCAL_NOTIFICATION,
        type: "web_hook",
      },
      syncToken: params.nextSyncToken,
    });

    return { watch: data };
  };
}

export default new GCalService();
