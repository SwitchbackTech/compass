import { type GaxiosResponse } from "gaxios";
import { GCAL_NOTIFICATION_ENDPOINT } from "@core/constants/core.constants";
import { Logger } from "@core/logger/winston.logger";
import {
  type gParamsEventsList,
  type gSchema$CalendarList,
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

const logger = Logger("app:gcal.service");

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

  /**
   * Resolves the single Google-side instance of a recurring event whose
   * *original* (pre-edit) position in the recurrence pattern matches
   * `originalStart` -- Google's `originalStartTime` stays fixed even after
   * that instance's own `start`/`end` are later edited, so this is how a
   * Compass occurrence's Google instance id is found the first time it needs
   * to sync (packet 05 step 4). A narrow window around `originalStart` keeps
   * this a single page in the overwhelming common case (instance starts
   * within one series never collide within a few hours of each other).
   * Returns null -- never throws -- when no instance in that window matches;
   * the caller decides how to handle a miss.
   */
  async findEventInstance(
    { gcal, quotaUser }: GoogleRequestContext,
    calendarId: string,
    recurringEventId: string,
    originalStart: Date,
  ): Promise<gSchema$Event | null> {
    const windowMs = 3 * 60 * 60 * 1000; // +/- 3 hours
    const timeMin = new Date(originalStart.getTime() - windowMs).toISOString();
    const timeMax = new Date(originalStart.getTime() + windowMs).toISOString();

    const response = await withGoogleRetry(() =>
      gcal.events.instances({
        calendarId,
        eventId: recurringEventId,
        timeMin,
        timeMax,
        quotaUser,
      }),
    );

    const { data } = this.validateGCalResponse(
      response,
      `Failed to fetch gcal instances for base event ${recurringEventId}`,
    );

    const targetMs = originalStart.getTime();
    const match = (data.items ?? []).find((item) => {
      const original = item.originalStartTime;
      const value = original?.dateTime ?? original?.date;
      if (!value) return false;
      return new Date(value).getTime() === targetMs;
    });

    if (!match) {
      logger.warn(
        `findEventInstance: no instance of recurring event ${recurringEventId} on calendar ${calendarId} matched originalStartTime ${originalStart.toISOString()}`,
      );
      return null;
    }

    return match;
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

  /**
   * getAllCalendarListPages
   * generator function to list all pages of the user's Google CalendarList.
   *
   * Google only returns `nextSyncToken` on the FINAL page - intermediate
   * pages return `nextPageToken` instead. `PaginationNotSupported` only
   * fires when the final page (no `nextPageToken`) also lacks a
   * `nextSyncToken`, since that's a genuine API contract violation rather
   * than a normal mid-pagination state.
   */
  async *getAllCalendarListPages(
    { gcal, quotaUser }: GoogleRequestContext,
    {
      nextSyncToken: syncToken,
      nextPageToken: pageToken,
    }: Partial<Pick<SyncDetails, "nextSyncToken" | "nextPageToken">> = {},
  ): AsyncGenerator<
    Pick<gSchema$CalendarList, "nextPageToken" | "nextSyncToken" | "items">
  > {
    let hasNextPage = false;

    do {
      const response = await withGoogleRetry(() =>
        gcal.calendarList.list({ syncToken, pageToken, quotaUser }),
      );

      const { data = {} } = this.validateGCalResponse(
        response,
        "Failed to fetch gcal calendarlist",
      );

      const { nextPageToken, nextSyncToken, items = [] } = data;

      pageToken = nextPageToken === null ? undefined : nextPageToken;
      syncToken = nextSyncToken === null ? undefined : nextSyncToken;

      hasNextPage =
        typeof nextPageToken === "string" && nextPageToken.length > 0;

      if (!hasNextPage && !nextSyncToken) {
        throw error(
          GcalError.PaginationNotSupported,
          "Calendarlist sync token not saved",
        );
      }

      yield { nextPageToken, nextSyncToken, items };
    } while (hasNextPage);
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
