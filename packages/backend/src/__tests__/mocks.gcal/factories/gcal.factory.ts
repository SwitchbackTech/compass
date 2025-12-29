import type { GaxiosPromise, GaxiosResponse } from "gaxios";
import { calendar } from "@googleapis/calendar";
import type { calendar_v3 } from "@googleapis/calendar";
import type { MethodOptions, StreamMethodOptions } from "@googleapis/calendar";
import { Status } from "@core/errors/status.codes";
import type {
  WithGcalId,
  gSchema$CalendarList,
  gSchema$CalendarListEntry,
  gSchema$Channel,
  gSchema$Event,
  gSchema$EventBase,
  gSchema$Events,
} from "@core/types/gcal";
import { Resource_Sync } from "@core/types/sync.types";
import {
  isBaseGCalEvent,
  isInstanceGCalEvent,
  isRegularGCalEvent,
} from "@core/util/event/gcal.event.util";
import { compassTestState } from "@backend/__tests__/helpers/mock.setup";
import { generateGcalId } from "@backend/__tests__/mocks.gcal/factories/gcal.event.factory";
import { GcalEventRRule } from "@backend/event/classes/gcal.event.rrule";

/**
 * Creates a mock GaxiosResponse object with all required Response properties
 */
const createMockGaxiosResponse = <T>(
  data: T,
  config: MethodOptions | StreamMethodOptions,
  status = 200,
  statusText = "OK",
  responseURL = "",
): GaxiosResponse<T> => {
  const headers = new Headers(config.headers as HeadersInit);
  const url = responseURL || (config.url?.toString() ?? "");

  return {
    config: config as any,
    data,
    status,
    statusText,
    headers,
    ok: status >= 200 && status < 300,
    redirected: false,
    type: "default" as ResponseType,
    url,
    body: null,
    bodyUsed: false,
    clone: () => {
      throw new Error("Not implemented");
    },
    arrayBuffer: async () => {
      throw new Error("Not implemented");
    },
    blob: async () => {
      throw new Error("Not implemented");
    },
    formData: async () => {
      throw new Error("Not implemented");
    },
    json: async () => data as any,
    text: async () => JSON.stringify(data),
    bytes: async () => {
      throw new Error("Not implemented");
    },
  } as GaxiosResponse<T>;
};

/**
 * Generates a paginated items for the Google Calendar API.
 *
 * @param items - The total array of items to be split into pages.
 * @param nextSyncToken - The next sync token for the items.
 * @param pageSize - The number of items per page.
 * @param pageToken - The page token for the items.
 * @returns The paginated items object.
 */
const generatePaginatedGcalItems = <Item = gSchema$Event>(
  items: Item[],
  nextSyncToken: string,
  pageSize: number,
  pageToken?: string,
): Omit<gSchema$Events, "items"> & { items: Item[] } => {
  const startIndex = pageToken ? parseInt(pageToken) : 0;
  const endIndex = startIndex + pageSize;
  const pageEvents = items.slice(startIndex, endIndex);
  const hasMore = endIndex < items.length;

  return {
    items: pageEvents,
    nextPageToken: hasMore ? endIndex.toString() : undefined,
    nextSyncToken: hasMore ? undefined : nextSyncToken,
  };
};

interface Config_MockGcal {
  events?: gSchema$Event[];
  pageSize?: number;
  nextSyncToken?: string;
  calendarList?: Partial<gSchema$CalendarListEntry>[];
  calendarListNextSyncToken?: string;
}
/**
 * Generates a mock Google Calendar API response.
 *
 * @param config - The configuration for the mock.
 * @returns The mock Google Calendar API response.
 */
export const mockGcal = ({
  pageSize = 3,
  nextSyncToken = "final-sync-token",
  calendarListNextSyncToken = "calendar-li,st-sync-token",
}: Config_MockGcal) => {
  const calendarClient = calendar({ version: "v3" });

  return jest.fn(() => ({
    ...calendarClient,
    events: {
      ...calendarClient.events,
      get: jest.fn(async (params: calendar_v3.Params$Resource$Events$Get) => {
        const { eventId } = params;
        const testState = compassTestState();
        const { all: events } = testState.events.gcalEvents;
        const event = events.find((e) => e.id === eventId);

        if (!event) throw new Error(`Event with id ${eventId} not found`);

        return Promise.resolve(
          createMockGaxiosResponse(
            event,
            {
              headers: new Headers(),
              url: new URL(
                "https://www.googleapis.com/calendar/v3/calendars/primary/events",
              ),
            },
            200,
            "OK",
            event.id ?? "",
          ),
        );
      }),
      insert: jest.fn(
        async (
          params: calendar_v3.Params$Resource$Events$Insert,
          options: StreamMethodOptions = { responseType: "stream" },
        ): GaxiosPromise<gSchema$Event> => {
          const testState = compassTestState();
          const { all: events } = testState.events.gcalEvents;
          const id = params.requestBody?.id ?? generateGcalId();
          const event = { ...params.requestBody, id } as gSchema$EventBase;
          const isBase = isBaseGCalEvent(event);
          const rrule = isBase ? new GcalEventRRule(event) : null;
          const instances = rrule?.instances() ?? [];
          const newEvents = [event, ...instances];

          events.push(...newEvents);

          return Promise.resolve(
            createMockGaxiosResponse(
              params.requestBody as gSchema$Event,
              options,
              200,
              "OK",
              params.requestBody!.id!,
            ),
          );
        },
      ),
      patch: jest.fn(
        async (
          params: calendar_v3.Params$Resource$Events$Patch,
          options: MethodOptions = {},
        ): GaxiosPromise<gSchema$Event> => {
          const testState = compassTestState();
          const { all: events } = testState.events.gcalEvents;
          const { eventId } = params;
          const eventIndex = events.findIndex((e) => e.id === eventId);

          if (eventIndex === -1) {
            throw new Error(`Event with id ${eventId} not found`);
          }

          let updatedEvent = { ...events[eventIndex], ...params.requestBody };

          if (updatedEvent.recurrence === null) {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { recurrence, ...update } = updatedEvent;
            updatedEvent = update as gSchema$EventBase;

            events
              .filter(
                ({ recurringEventId }) => updatedEvent.id === recurringEventId,
              )
              .forEach((instance) => {
                const index = events.findIndex((e) => e.id === instance.id);
                if (index !== -1) {
                  events.splice(index, 1);
                }
              });
          }

          events.splice(
            eventIndex,
            1,
            updatedEvent as WithGcalId<gSchema$Event>,
          );

          return Promise.resolve(
            createMockGaxiosResponse(
              updatedEvent,
              options,
              200,
              "OK",
              updatedEvent.id!,
            ),
          );
        },
      ),
      update: jest.fn(
        async (
          params: calendar_v3.Params$Resource$Events$Update,
          options: MethodOptions = {},
        ): GaxiosPromise<gSchema$Event> => {
          const testState = compassTestState();
          const { all: events } = testState.events.gcalEvents;
          const { eventId } = params;
          const eventIndex = events.findIndex((e) => e.id === eventId);

          if (eventIndex === -1) {
            throw new Error(`Event with id ${eventId} not found`);
          }

          let updatedEvent = {
            ...events[eventIndex],
            ...params.requestBody,
          } as gSchema$EventBase;

          if (updatedEvent.recurrence === null) {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { recurrence, ...update } = updatedEvent;
            updatedEvent = update as gSchema$EventBase;

            events
              .filter(
                ({ recurringEventId }) => updatedEvent.id === recurringEventId,
              )
              .forEach((instance) => {
                const index = events.findIndex((e) => e.id === instance.id);
                if (index !== -1) {
                  events.splice(index, 1);
                }
              });
          }

          events.splice(eventIndex, 1, updatedEvent);

          const isBase = isBaseGCalEvent(updatedEvent);
          const rrule = isBase ? new GcalEventRRule(updatedEvent) : null;
          const instances = rrule?.instances() ?? [];

          instances.forEach((instance) => {
            const instanceIndex = events.findIndex((e) => e.id === instance.id);

            if (instanceIndex !== -1) {
              events.splice(instanceIndex, 1, instance);
            } else {
              events.push(instance);
            }
          });

          return Promise.resolve(
            createMockGaxiosResponse(
              updatedEvent,
              options,
              200,
              "OK",
              updatedEvent.id!,
            ),
          );
        },
      ),
      delete: jest.fn(
        async (params: calendar_v3.Params$Resource$Events$Delete) => {
          const testState = compassTestState();
          const { all: events } = testState.events.gcalEvents;
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
      list: jest.fn(async (params: calendar_v3.Params$Resource$Events$List) => {
        const testState = compassTestState();
        const { all: events } = testState.events.gcalEvents;

        // When singleEvents is false, only return base events and regular events - without instance events
        if (!params.singleEvents) {
          const baseEvents = events.filter(
            (e) => isBaseGCalEvent(e) || isRegularGCalEvent(e),
          );

          const eventsPage = generatePaginatedGcalItems(
            baseEvents,
            nextSyncToken,
            params.maxResults ?? pageSize,
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
          nextSyncToken,
          params.maxResults ?? pageSize,
          params.pageToken,
        );

        return {
          statusText: "OK",
          status: 200,
          data: eventsPage,
        };
      }),
      instances: jest.fn(
        async (params: calendar_v3.Params$Resource$Events$Instances) => {
          const testState = compassTestState();
          const { all: events } = testState.events.gcalEvents;
          const { eventId: id } = params;

          const baseEvent = events.find((e) => e.id === id);

          if (!baseEvent) throw new Error(`Event with id ${id} not found`);

          const instances = events.filter(
            ({ recurringEventId }) => recurringEventId === id,
          );

          const eventsPage = generatePaginatedGcalItems(
            instances,
            nextSyncToken,
            params.maxResults ?? pageSize,
            params.pageToken,
          );

          return {
            statusText: "OK",
            status: 200,
            data: eventsPage,
          };
        },
      ),
      watch: jest.fn(
        async (
          params: calendar_v3.Params$Resource$Events$Watch,
          options: MethodOptions = {},
        ): GaxiosPromise<gSchema$Channel> =>
          Promise.resolve(
            createMockGaxiosResponse<gSchema$Channel>(
              {
                ...params.requestBody,
                resourceId: params.calendarId,
              },
              options,
              200,
              "OK",
              params.requestBody!.address!,
            ),
          ),
      ),
    },
    calendarList: {
      ...calendarClient.calendarList,
      list: jest.fn(
        async (
          params: calendar_v3.Params$Resource$Events$Watch = {},
          options: MethodOptions = {},
        ): GaxiosPromise<gSchema$CalendarList> => {
          const { calendarlist } = compassTestState();

          return Promise.resolve(
            createMockGaxiosResponse<gSchema$CalendarList>(
              generatePaginatedGcalItems(
                calendarlist,
                calendarListNextSyncToken,
                params.maxResults ?? pageSize,
                params.pageToken,
              ),
              options,
              200,
              "OK",
              params.requestBody?.address ?? "",
            ),
          );
        },
      ),
      watch: jest.fn(
        async (
          params: calendar_v3.Params$Resource$Calendarlist$Watch,
          options: MethodOptions = {},
        ): GaxiosPromise<gSchema$Channel> =>
          Promise.resolve(
            createMockGaxiosResponse<gSchema$Channel>(
              {
                ...params.requestBody,
                resourceId: Resource_Sync.CALENDAR,
              },
              options,
              200,
              "OK",
              params.requestBody!.address!,
            ),
          ),
      ),
    },
    channels: {
      ...calendarClient.channels,
      stop: jest.fn(
        async (
          params: calendar_v3.Params$Resource$Channels$Stop,
          options: MethodOptions = {},
        ): GaxiosPromise<gSchema$Channel> =>
          Promise.resolve(
            createMockGaxiosResponse<gSchema$Channel>(
              params.requestBody as gSchema$Channel,
              options,
              Status.NO_CONTENT,
              "OK",
              params.requestBody!.address!,
            ),
          ),
      ),
    },
  }));
};
