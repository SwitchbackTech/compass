import type { GaxiosPromise } from "gaxios";
import type { calendar_v3 } from "googleapis";
import { GoogleApis } from "googleapis";
import type {
  MethodOptions,
  StreamMethodOptions,
} from "googleapis/build/src/apis/calendar";
import { z } from "zod/v4";
import { faker } from "@faker-js/faker";
import { Status } from "@core/errors/status.codes";
import { CalendarProvider } from "@core/types/calendar.types";
import type {
  gSchema$CalendarList,
  gSchema$Channel,
  gSchema$Event,
  gSchema$EventBase,
  gSchema$Events,
} from "@core/types/gcal";
import {
  isBaseGCalEvent,
  isInstanceGCalEvent,
  isRegularGCalEvent,
} from "@core/util/event/gcal.event.util";
import { UserDriver } from "@backend/__tests__/drivers/user.driver";
import { UtilDriver } from "@backend/__tests__/drivers/util.driver";
import { MockOAuth2Client } from "@backend/__tests__/helpers/mock.google-oauth2";
import {
  generateGcalId,
  mockRecurringGcalInstances,
} from "@backend/__tests__/mocks.gcal/factories/gcal.event.factory";
import { GCAL_LIST_PAGE_SIZE } from "@backend/common/constants/backend.constants";

/**
 * Generates a paginated items for the Google Calendar API.
 *
 * @param items - The total array of items to be split into pages.
 * @param nextSyncToken - The next sync token for the items.
 * @param pageSize - The number of items per page.
 * @param pageToken - The page token for the items.
 * @returns The paginated items object.
 */
const generatePaginatedGcalItems = <
  Item extends Pick<gSchema$Event, "id"> = gSchema$Event,
>(
  items: Item[],
  pageSize: number,
  syncToken?: string,
  pageToken?: string,
): Omit<gSchema$Events, "items"> & { items: Item[] } => {
  const totalPages = Math.ceil(items.length / pageSize);
  const page = Math.min(1, z.coerce.number().parse(pageToken ?? "1"));
  const pageIndex = Math.min(0, page - 1);
  const startIndex = syncToken ? parseInt(syncToken) : pageIndex * pageSize;
  const endIndex = pageSize * (pageToken ? page : totalPages);
  const pageEvents = items.slice(startIndex, endIndex);
  const total = pageIndex * pageSize + pageEvents.length;
  const hasMore = endIndex < items.length;
  const nextPage = page + 1;

  return {
    items: pageEvents,
    nextPageToken: hasMore ? nextPage.toString() : undefined,
    nextSyncToken: hasMore ? undefined : total.toString(),
  };
};

/**
 * Generates a mock Google Calendar API response.
 *
 * @param config - The configuration for the mock.
 * @returns The mock Google Calendar API response.
 */
export const mockGcal = (googleapis: GoogleApis) => {
  const calendar = googleapis.calendar({ version: "v3" });

  return jest.fn(({ auth }: { auth: MockOAuth2Client }) => {
    const gRefreshToken = auth?.credentials?.refresh_token;

    const watch = jest.fn(
      async (
        {
          requestBody,
        }:
          | calendar_v3.Params$Resource$Events$Watch
          | calendar_v3.Params$Resource$Calendarlist$Watch,
        options: MethodOptions = {},
      ): GaxiosPromise<gSchema$Channel> => {
        if (!requestBody) throw new Error("channel details not specified");

        const { sub } = UserDriver.decodeGoogleRefreshToken(gRefreshToken);

        const state = UtilDriver.getUserTestState(CalendarProvider.GOOGLE, sub);

        const { resourceId = faker.string.nanoid() } = requestBody;

        state.channels.push(Object.assign(requestBody, { resourceId }));

        return Promise.resolve({
          config: options,
          statusText: "OK",
          status: 200,
          data: requestBody,
          headers: options.headers!,
          request: { responseURL: requestBody!.address! },
        });
      },
    );

    const update = jest.fn(
      async (
        params:
          | calendar_v3.Params$Resource$Events$Patch
          | calendar_v3.Params$Resource$Events$Update,
        options: MethodOptions = {},
      ): GaxiosPromise<gSchema$Event> => {
        const { sub } = UserDriver.decodeGoogleRefreshToken(gRefreshToken);
        const calendarTestState = UtilDriver.getCalendarTestState(
          CalendarProvider.GOOGLE,
          sub,
          params.calendarId,
        );

        const { events } = calendarTestState;
        const { eventId } = params;
        const eventIndex = events.findIndex((e) => e.id === eventId);

        if (eventIndex === -1) {
          throw new Error(`Event with id ${eventId} not found`);
        }

        let updatedEvent = {
          ...events[eventIndex],
          ...params.requestBody,
        };

        if (updatedEvent.recurrence === null) {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { recurrence, ...update } = updatedEvent;
          updatedEvent = update as gSchema$EventBase;
        }

        events
          .filter((e) => e.recurringEventId === updatedEvent.id)
          .forEach((instance) => {
            const index = events.findIndex((e) => e.id === instance.id);

            if (index !== -1) events.splice(index, 1);
          });

        const isBase = isBaseGCalEvent(updatedEvent);

        const instances = isBase
          ? mockRecurringGcalInstances(updatedEvent as gSchema$EventBase)
          : [];

        const newEvents = [updatedEvent, ...instances];

        events.splice(eventIndex, 1, ...newEvents);

        return Promise.resolve({
          config: options,
          statusText: "OK",
          status: 200,
          data: updatedEvent,
          headers: options.headers!,
          request: { responseURL: updatedEvent.id! },
        });
      },
    );

    return {
      ...calendar,
      events: {
        ...calendar.events,
        get: jest.fn(async (params: calendar_v3.Params$Resource$Events$Get) => {
          const { eventId, calendarId } = params;
          const { sub } = UserDriver.decodeGoogleRefreshToken(gRefreshToken);
          const calendarTestState = UtilDriver.getCalendarTestState(
            CalendarProvider.GOOGLE,
            sub,
            calendarId,
          );

          const { events } = calendarTestState;
          const event = events.find((e) => e.id === eventId);

          if (!event) throw new Error(`Event with id ${eventId} not found`);

          return Promise.resolve({
            statusText: "OK",
            status: 200,
            data: event,
          });
        }),
        insert: jest.fn(
          async (
            params: calendar_v3.Params$Resource$Events$Insert,
            options: StreamMethodOptions = { responseType: "stream" },
          ): GaxiosPromise<gSchema$Event> => {
            const { sub } = UserDriver.decodeGoogleRefreshToken(gRefreshToken);
            const calendarTestState = UtilDriver.getCalendarTestState(
              CalendarProvider.GOOGLE,
              sub,
              params.calendarId,
            );
            const { events } = calendarTestState;
            const id = params.requestBody?.id ?? generateGcalId();
            const event = { ...params.requestBody, id } as gSchema$EventBase;
            const isBase = isBaseGCalEvent(event);
            const instances = isBase ? mockRecurringGcalInstances(event) : [];
            const newEvents = [event, ...instances];

            events.push(...newEvents);

            return Promise.resolve({
              config: options,
              statusText: "OK",
              status: 200,
              data: params.requestBody as gSchema$Event,
              headers: options.headers!,
              request: { responseURL: params.requestBody!.id! },
            });
          },
        ),
        patch: update,
        update: update,
        delete: jest.fn(
          async (params: calendar_v3.Params$Resource$Events$Delete) => {
            const { sub } = UserDriver.decodeGoogleRefreshToken(gRefreshToken);
            const calendarTestState = UtilDriver.getCalendarTestState(
              CalendarProvider.GOOGLE,
              sub,
              params.calendarId,
            );

            const { events } = calendarTestState;
            const { eventId } = params;
            const eventIndex = events.findIndex((e) => e.id === eventId);

            if (eventIndex === -1) {
              throw new Error(`Event with id ${eventId} not found`);
            }

            const event = events[eventIndex]!;
            const isRecurring = isBaseGCalEvent(event);

            events.splice(eventIndex, 1);

            if (isRecurring) {
              // Also delete all instances of the recurring event
              const instanceEvents = events.filter(isInstanceGCalEvent);

              instanceEvents.forEach((instance) => {
                const index = events.findIndex((e) => e.id === instance.id);
                if (index !== -1) {
                  events.splice(index, 1);
                }
              });
            }

            return Promise.resolve({
              statusText: "OK",
              status: 204,
              data: {},
            });
          },
        ),
        list: jest.fn(
          async (params: calendar_v3.Params$Resource$Events$List) => {
            const { sub } = UserDriver.decodeGoogleRefreshToken(gRefreshToken);
            const calendarTestState = UtilDriver.getCalendarTestState(
              CalendarProvider.GOOGLE,
              sub,
              params.calendarId,
            );

            const { events } = calendarTestState;

            // When singleEvents is false, only return base events and regular events - without instance events
            if (!params.singleEvents) {
              const baseEvents = events.filter(
                (e) => isBaseGCalEvent(e) || isRegularGCalEvent(e),
              );

              const eventsPage = generatePaginatedGcalItems(
                baseEvents,
                params.maxResults ?? GCAL_LIST_PAGE_SIZE,
                params.syncToken,
                params.pageToken,
              );

              return {
                statusText: "OK",
                status: 200,
                data: eventsPage,
              };
            }

            // When singleEvents is true, return instance events and regular events - without base events
            const instanceAndRegularEvents = events.filter(
              (e) => isRegularGCalEvent(e) || isInstanceGCalEvent(e),
            );

            const eventsPage = generatePaginatedGcalItems(
              instanceAndRegularEvents,
              params.maxResults ?? GCAL_LIST_PAGE_SIZE,
              params.syncToken,
              params.pageToken,
            );

            return {
              statusText: "OK",
              status: 200,
              data: eventsPage,
            };
          },
        ),
        instances: jest.fn(
          async (params: calendar_v3.Params$Resource$Events$Instances) => {
            const { sub } = UserDriver.decodeGoogleRefreshToken(gRefreshToken);
            const calendarTestState = UtilDriver.getCalendarTestState(
              CalendarProvider.GOOGLE,
              sub,
              params.calendarId,
            );

            const { events } = calendarTestState;
            const { eventId: id } = params;

            const baseEvent = events.find((e) => e.id === id);

            if (!baseEvent) throw new Error(`Event with id ${id} not found`);

            const instances = events.filter(
              ({ recurringEventId }) => recurringEventId === id,
            );

            const eventsPage = generatePaginatedGcalItems(
              instances,
              params.maxResults ?? GCAL_LIST_PAGE_SIZE,
              undefined,
              params.pageToken,
            );

            return {
              statusText: "OK",
              status: 200,
              data: eventsPage,
            };
          },
        ),
        watch,
      },
      calendarList: {
        ...calendar.calendarList,
        list: jest.fn(
          async (
            params: calendar_v3.Params$Resource$Events$Watch = {},
            options: MethodOptions = {},
          ): GaxiosPromise<gSchema$CalendarList> => {
            const { sub } = UserDriver.decodeGoogleRefreshToken(gRefreshToken);

            const userTestState = UtilDriver.getUserTestState(
              CalendarProvider.GOOGLE,
              sub,
            );

            const calendars = [...userTestState.calendars.values()].map(
              (user) => user.calendar,
            );

            return Promise.resolve({
              config: options,
              statusText: "OK",
              status: 200,
              headers: options.headers!,
              request: { responseURL: params.requestBody?.address ?? "" },
              data: generatePaginatedGcalItems(
                calendars,
                params.maxResults ?? GCAL_LIST_PAGE_SIZE,
                params.syncToken,
                params.pageToken,
              ),
            });
          },
        ),
        watch,
      },
      channels: {
        ...calendar.channels,
        stop: jest.fn(
          async (
            params: calendar_v3.Params$Resource$Channels$Stop,
            options: MethodOptions = {},
          ): GaxiosPromise<gSchema$Channel> => {
            const { sub } = UserDriver.decodeGoogleRefreshToken(gRefreshToken);
            const userTestState = UtilDriver.getUserTestState(
              CalendarProvider.GOOGLE,
              sub,
            );

            const { id, resourceId } = params.requestBody!;
            const index = userTestState.channels.findIndex(
              (c) => c.id === id && c.resourceId === resourceId,
            );

            const channel = userTestState.channels[index];

            if (channel) userTestState.channels.splice(index, 1);

            return Promise.resolve({
              config: options,
              statusText: channel ? "OK" : "NOT FOUND",
              status: channel ? Status.NO_CONTENT : Status.NOT_FOUND,
              data: channel as gSchema$Channel,
              headers: options.headers!,
              request: { responseURL: params.requestBody!.address! },
            });
          },
        ),
      },
    };
  });
};
