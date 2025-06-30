import type { GaxiosPromise } from "gaxios";
import type { calendar_v3 } from "googleapis";
import { GoogleApis } from "googleapis";
import type { MethodOptions } from "googleapis/build/src/apis/calendar";
import type {
  gSchema$CalendarListEntry,
  gSchema$Channel,
  gSchema$Event,
  gSchema$EventBase,
  gSchema$Events,
} from "@core/types/gcal";
import {
  isBaseGCalEvent,
  isInstanceGCalEvent,
  isRegularGCalEvent,
} from "../../../../../core/src/util/event/gcal.event.util";
import { mockRecurringGcalEvents } from "./gcal.event.factory";

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
  events = [],
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
      list: jest.fn(
        async (params: { pageToken?: string; singleEvents?: boolean }) => {
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
        const { eventId: id } = params;

        const baseEvent = events.find(isBaseGCalEvent) as gSchema$EventBase;

        const data = mockRecurringGcalEvents({ ...baseEvent, id }, 3, 7);

        return {
          statusText: "OK",
          status: 200,
          data: {
            items: data.instances,
          },
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
