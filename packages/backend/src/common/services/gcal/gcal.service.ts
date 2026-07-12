import { type GaxiosResponse } from "gaxios";
import { GCAL_NOTIFICATION_ENDPOINT } from "@core/constants/core.constants";
import {
  type gParamsEventsList,
  type gSchema$Event,
  type gSchema$Events,
} from "@core/types/gcal";
import {
  type Params_WatchEvents,
  Resource_Sync,
  type SyncDetails,
} from "@core/types/sync.types";
import { IDSchemaV4 } from "@core/types/type.utils";
import { GCAL_PRIMARY } from "@backend/common/constants/backend.constants";
import { CONFIG } from "@backend/common/constants/config.constants";
import { error } from "@backend/common/errors/handlers/error.handler";
import { GcalError } from "@backend/common/errors/integration/gcal/gcal.errors";
import { type GoogleRequestContext } from "@backend/common/services/gcal/gcal.context";
import { withGoogleRetry } from "@backend/common/services/gcal/gcal.retry";
import { encodeChannelToken } from "@backend/sync/services/watch/google-watch-token";

const getGcalNotificationAddress = () =>
  CONFIG.GCAL_WEBHOOK_BASEURL + GCAL_NOTIFICATION_ENDPOINT;

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
    { gcal, quotaUser }: GoogleRequestContext,
    gcalEventId: string,
    calendarId = GCAL_PRIMARY,
  ): Promise<gSchema$Event> {
    const response = await withGoogleRetry(() =>
      gcal.events.get({ calendarId, eventId: gcalEventId, quotaUser }),
    );

    return this.validateGCalResponse(response).data;
  }

  async createEvent(
    { gcal, quotaUser }: GoogleRequestContext,
    calendarId: string,
    event: gSchema$Event,
  ): Promise<gSchema$Event> {
    const response = await withGoogleRetry(() =>
      gcal.events.insert({ calendarId, quotaUser, requestBody: event }),
    );

    return this.validateGCalResponse(response).data;
  }

  async deleteEvent(
    { gcal, quotaUser }: GoogleRequestContext,
    calendarId: string,
    gcalEventId: string,
  ) {
    const response = await withGoogleRetry(() =>
      gcal.events.delete({
        calendarId,
        eventId: gcalEventId,
        quotaUser,
        sendUpdates: "all",
      }),
    );

    return response;
  }

  private async getEventInstances(
    { gcal, quotaUser }: GoogleRequestContext,
    calendarId: string,
    eventId: string,
    timeMin?: string,
    timeMax?: string,
    pageToken?: string,
    maxResults?: number,
  ) {
    const response = await withGoogleRetry(() =>
      gcal.events.instances({
        calendarId,
        eventId,
        timeMin,
        timeMax,
        pageToken,
        maxResults,
        quotaUser,
      }),
    );

    return this.validateGCalResponse(response);
  }

  async getEvents(context: GoogleRequestContext, params: gParamsEventsList) {
    const response = await withGoogleRetry(() =>
      context.gcal.events.list({ ...params, quotaUser: context.quotaUser }),
    );

    return this.validateGCalResponse(response);
  }

  async *getBaseRecurringEventInstances({
    context,
    calendarId,
    eventId,
    maxResults = 1000,
    timeMin,
    timeMax,
    pageToken,
  }: {
    context: GoogleRequestContext;
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
        context,
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
    context,
    calendarId,
    maxResults = 1000,
    singleEvents = false,
    pageToken,
    syncToken,
  }: {
    context: GoogleRequestContext;
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
      const { data = {} } = await this.getEvents(context, {
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
    { gcal, quotaUser }: GoogleRequestContext,
    {
      nextSyncToken: syncToken,
      nextPageToken: pageToken,
    }: Partial<Pick<SyncDetails, "nextSyncToken" | "nextPageToken">> = {},
  ) {
    const response = await withGoogleRetry(() =>
      gcal.calendarList.list({ syncToken, pageToken, quotaUser }),
    );

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

  /**
   * events.patch semantics (A28): merges by key so fields Compass does not
   * model (attendees, location, reminders, ...) are left untouched. Never
   * events.update, which replaces the whole resource.
   */
  async patchEvent(
    { gcal, quotaUser }: GoogleRequestContext,
    calendarId: string,
    gEventId: string,
    event: gSchema$Event,
  ) {
    const response = await withGoogleRetry(() =>
      gcal.events.patch({
        calendarId,
        eventId: gEventId,
        quotaUser,
        requestBody: event,
      }),
    );

    return this.validateGCalResponse(response).data;
  }

  watchCalendars = async (
    { gcal, quotaUser }: GoogleRequestContext,
    params: Omit<Params_WatchEvents, "gCalendarId" | "resourceId">,
  ) => {
    const response = await withGoogleRetry(() =>
      gcal.calendarList.watch({
        quotaUser,
        requestBody: {
          // reminder: address always needs to be HTTPS
          address: getGcalNotificationAddress(),
          expiration: params.expiration,
          id: IDSchemaV4.parse(params.channelId),
          token: encodeChannelToken({ resource: Resource_Sync.CALENDAR }),
          type: "web_hook",
        },
      }),
    );

    return { watch: this.validateGCalResponse(response).data };
  };

  watchEvents = async (
    { gcal, quotaUser }: GoogleRequestContext,
    params: Omit<Params_WatchEvents, "resourceId">,
  ) => {
    const response = await withGoogleRetry(() =>
      gcal.events.watch({
        calendarId: params.gCalendarId,
        quotaUser,
        requestBody: {
          // reminder: address always needs to be HTTPS
          address: getGcalNotificationAddress(),
          expiration: params.expiration,
          id: IDSchemaV4.parse(params.channelId),
          token: encodeChannelToken({ resource: Resource_Sync.EVENTS }),
          type: "web_hook",
        },
      }),
    );

    return { watch: this.validateGCalResponse(response).data };
  };

  stopWatch = async (
    { gcal, quotaUser }: GoogleRequestContext,
    params: Pick<Params_WatchEvents, "channelId"> & {
      resourceId: string;
    },
  ) => {
    const response = await withGoogleRetry(() =>
      gcal.channels.stop({
        quotaUser,
        requestBody: {
          id: params.channelId,
          resourceId: params.resourceId,
        },
      }),
    );

    return this.validateGCalResponse(response);
  };
}

export default new GCalService();
