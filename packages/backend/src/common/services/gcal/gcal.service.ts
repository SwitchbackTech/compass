import type { GaxiosResponse } from "gaxios";
import { GCAL_NOTIFICATION_ENDPOINT } from "@core/constants/core.constants";
import type {
  gCalendar,
  gParamsEventsList,
  gSchema$Event,
  gSchema$Events,
} from "@core/types/gcal";
import {
  type Params_WatchEvents,
  Resource_Sync,
  SyncDetails,
} from "@core/types/sync.types";
import { IDSchemaV4 } from "@core/types/type.utils";
import { GCAL_PRIMARY } from "@backend/common/constants/backend.constants";
import { error } from "@backend/common/errors/handlers/error.handler";
import { GcalError } from "@backend/common/errors/integration/gcal/gcal.errors";
import { getBaseURL } from "@backend/servers/ngrok/ngrok.utils";
import { encodeChannelToken } from "@backend/sync/util/watch.util";

class GCalService {
  private validateGCalResponse<T>(
    response: GaxiosResponse<T> | { status: number; data: T },
    message = "Gcal request failed.",
  ) {
    const { status } = response;

    if (status >= 400) throw error(GcalError.Unsure, message);

    return response as GaxiosResponse<T>;
  }

  async getEvent(
    gcal: gCalendar,
    gcalEventId: string,
    calendarId = GCAL_PRIMARY,
  ): Promise<gSchema$Event> {
    const response = await gcal.events.get({
      calendarId,
      eventId: gcalEventId,
    });

    return this.validateGCalResponse(response).data;
  }

  async createEvent(
    gcal: gCalendar,
    event: gSchema$Event,
  ): Promise<gSchema$Event> {
    const response = await gcal.events.insert({
      calendarId: GCAL_PRIMARY,
      requestBody: event,
    });

    return this.validateGCalResponse(response).data;
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

    return this.validateGCalResponse(response);
  }

  async getEvents(gcal: gCalendar, params: gParamsEventsList) {
    const response = await gcal.events.list(params);

    return this.validateGCalResponse(response);
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

  async getCalendarlist(
    gcal: gCalendar,
    {
      nextSyncToken: syncToken,
      nextPageToken: pageToken,
    }: Partial<Pick<SyncDetails, "nextSyncToken" | "nextPageToken">> = {},
  ) {
    const response = await gcal.calendarList.list({ syncToken, pageToken });

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

    return this.validateGCalResponse(response).data;
  }

  watchCalendars = async (
    gcal: gCalendar,
    params: Omit<Params_WatchEvents, "gCalendarId" | "resourceId">,
  ) => {
    const response = await gcal.calendarList.watch({
      quotaUser: params.quotaUser,
      requestBody: {
        // reminder: address always needs to be HTTPS
        address: getBaseURL() + GCAL_NOTIFICATION_ENDPOINT,
        expiration: params.expiration,
        id: IDSchemaV4.parse(params.channelId),
        token: encodeChannelToken({ resource: Resource_Sync.CALENDAR }),
        type: "web_hook",
      },
    });

    return { watch: this.validateGCalResponse(response).data };
  };

  watchEvents = async (
    gcal: gCalendar,
    params: Omit<Params_WatchEvents, "resourceId">,
  ) => {
    const response = await gcal.events.watch({
      calendarId: params.gCalendarId,
      quotaUser: params.quotaUser,
      requestBody: {
        // reminder: address always needs to be HTTPS
        address: getBaseURL() + GCAL_NOTIFICATION_ENDPOINT,
        expiration: params.expiration,
        id: IDSchemaV4.parse(params.channelId),
        token: encodeChannelToken({ resource: Resource_Sync.EVENTS }),
        type: "web_hook",
      },
    });

    return { watch: this.validateGCalResponse(response).data };
  };

  stopWatch = async (
    gcal: gCalendar,
    params: Pick<Params_WatchEvents, "channelId" | "quotaUser"> & {
      resourceId: string;
    },
  ) => {
    const response = await gcal.channels.stop({
      quotaUser: params.quotaUser,
      requestBody: {
        id: params.channelId,
        resourceId: params.resourceId,
      },
    });

    return this.validateGCalResponse(response);
  };
}

export default new GCalService();
