import type { GaxiosPromise } from "gaxios";
import type { calendar_v3 } from "googleapis";
import { GoogleApis } from "googleapis";
import type {
  MethodOptions,
  StreamMethodOptions,
} from "googleapis/build/src/apis/calendar";
import type {
  WithGcalId,
  gSchema$CalendarListEntry,
  gSchema$Channel,
  gSchema$Event,
  gSchema$Events,
} from "@core/types/gcal";
import {
  isBaseGCalEvent,
  isInstanceGCalEvent,
  isRegularGCalEvent,
} from "@core/util/event/gcal.event.util";
import { compassTestState } from "@backend/__tests__/helpers/mock.setup";
import { mockRecurringGcalEvents } from "@backend/__tests__/mocks.gcal/factories/gcal.event.factory";

/**
 * Generates a paginated events object for the Google Calendar API.
 *
 * @param events - The total array of events to be split into pages.
 * @param nextSyncToken - The next sync token for the events.
 * @param pageSize - The number of events per page.
 * @param pageToken - The page token for the events.
 * @returns The paginated events object.
 */
const generatePaginatedEvents = (
  events: gSchema$Event[],
  nextSyncToken: string,
  pageSize: number,
  pageToken?: string,
): gSchema$Events => {
  const startIndex = pageToken ? parseInt(pageToken) : 0;
  const endIndex = startIndex + pageSize;
  const pageEvents = events.slice(startIndex, endIndex);
  const hasMore = endIndex < events.length;

  const page = {
    items: pageEvents,
    nextPageToken: hasMore ? endIndex.toString() : undefined,
    nextSyncToken: hasMore ? undefined : nextSyncToken,
  };
  return page;
};

/**
 * Generates a mock Google Calendar calendar list entry.
 *
 * @param overrides - The overrides for the mock.
 * @returns The mock Google Calendar calendar list entry.
 */
export const createMockCalendarList = (
  overrides: Partial<gSchema$CalendarListEntry> = {},
): gSchema$CalendarListEntry => ({
  id: "test-calendar",
  primary: true,
  summary: "Test Calendar",
  ...overrides,
});

interface Config_MockGcal {
  events?: gSchema$Event[];
  pageSize?: number;
  nextSyncToken?: string;
  calendarList?: Partial<gSchema$CalendarListEntry>[];
  calendarListNextSyncToken?: string;
  googleapis: GoogleApis;
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
  calendarList = [createMockCalendarList()],
  calendarListNextSyncToken = "calendar-li,st-sync-token",
  googleapis,
}: Config_MockGcal) => {
  const calendar = googleapis.calendar("v3");

  return jest.fn(() => ({
    ...calendar,
    events: {
      ...calendar.events,
      get: jest.fn(async (params: calendar_v3.Params$Resource$Events$Get) => {
        const { eventId } = params;
        const testState = compassTestState();
        const { all: events } = testState.events.gcalEvents;
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
          const testState = compassTestState();
          const { all: events } = testState.events.gcalEvents;

          events.push(params.requestBody as WithGcalId<gSchema$Event>);

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

          const updatedEvent = { ...events[eventIndex], ...params.requestBody };

          events.splice(
            eventIndex,
            1,
            updatedEvent as WithGcalId<gSchema$Event>,
          );

          return Promise.resolve({
            config: options,
            statusText: "OK",
            status: 200,
            data: updatedEvent,
            headers: options.headers!,
            request: { responseURL: updatedEvent.id! },
          });
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

          events.splice(eventIndex, 1);

          return Promise.resolve({
            statusText: "OK",
            status: 204,
            data: {},
          });
        },
      ),
      list: jest.fn(
        async (params: { pageToken?: string; singleEvents?: boolean }) => {
          const testState = compassTestState();
          const { all: events } = testState.events.gcalEvents;

          // When singleEvents is false, only return base events and regular events - without instance events
          if (!params.singleEvents) {
            const baseEvents = events.filter(
              (e) => isBaseGCalEvent(e) || isRegularGCalEvent(e),
            );

            const eventsPage = generatePaginatedEvents(
              baseEvents,
              nextSyncToken,
              pageSize,
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

          const eventsPage = generatePaginatedEvents(
            instanceAndRegularEvents,
            nextSyncToken,
            pageSize,
            params.pageToken,
          );
          return {
            statusText: "OK",
            status: 200,
            data: eventsPage,
          };
        },
      ),
      instances: jest.fn(async (params: { eventId: string }) => {
        const testState = compassTestState();
        const { all: events } = testState.events.gcalEvents;
        const { eventId: id } = params;

        const baseEvent = events.find((e) => e.id === id);

        if (!baseEvent) throw new Error(`Event with id ${id} not found`);

        const data = mockRecurringGcalEvents({ ...baseEvent, id });

        return {
          statusText: "OK",
          status: 200,
          data: { items: data.instances },
        };
      }),
      watch: jest.fn(
        async (
          params: calendar_v3.Params$Resource$Events$Watch,
          options: MethodOptions = {},
        ): GaxiosPromise<gSchema$Channel> =>
          Promise.resolve({
            config: options,
            statusText: "OK",
            status: 200,
            data: {
              ...params.requestBody,
              resourceId: params.calendarId,
            },
            headers: options.headers!,
            request: { responseURL: params.requestBody!.address! },
          }),
      ),
    },
    calendarList: {
      ...calendar.calendarList,
      list: jest.fn(() => ({
        data: {
          items: calendarList,
          nextSyncToken: calendarListNextSyncToken,
        },
      })),
    },
  }));
};
