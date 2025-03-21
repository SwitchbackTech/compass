import {
  gSchema$CalendarListEntry,
  gSchema$Event,
  gSchema$Events,
} from "@core/types/gcal";

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
  calendarListNextSyncToken = "calendar-list-sync-token",
}: Config_MockGcal = {}) => {
  return {
    google: {
      calendar: jest.fn().mockReturnValue({
        events: {
          list: jest
            .fn()
            .mockImplementation(async (params: { pageToken?: string }) => {
              const eventsPage = generatePaginatedEvents(
                events,
                nextSyncToken,
                pageSize,
                params.pageToken,
              );

              return {
                data: eventsPage,
              };
            }),
          instances: jest
            .fn()
            .mockImplementation(async (params: { eventId: string }) => {
              const { eventId } = params;
              const instances = Array(3)
                .fill(null)
                .map(() => ({
                  ...events[0],
                  recurringEventId: eventId,
                }));

              return {
                data: {
                  items: instances,
                },
              };
            }),
        },
        calendarList: {
          list: jest.fn().mockResolvedValue({
            data: {
              items: calendarList,
              nextSyncToken: calendarListNextSyncToken,
            },
          }),
        },
      }),
    },
  };
};
