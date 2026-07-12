jest.mock("@backend/common/constants/config.constants", () => ({
  CONFIG: { GCAL_WEBHOOK_BASEURL: "https://example.trycloudflare.com/api" },
}));

jest.mock("@backend/sync/services/watch/google-watch-token", () => ({
  encodeChannelToken: jest.fn(() => "encoded-token"),
}));

import { GaxiosError, type GaxiosResponse } from "gaxios";
import { GCAL_NOTIFICATION_ENDPOINT } from "@core/constants/core.constants";
import { type gSchema$Event } from "@core/types/gcal";
import { type GoogleRequestContext } from "./gcal.context";
import gcalService from "./gcal.service";

describe("gcal.service watch callbacks", () => {
  it("uses the Google webhook base URL for event watch callback addresses", async () => {
    const watch = jest.fn().mockResolvedValue({
      status: 200,
      data: { id: "507f1f77bcf86cd799439011", resourceId: "resource-id" },
    });
    const context = {
      gcal: { events: { watch } },
      quotaUser: "user-1",
    } as unknown as GoogleRequestContext;

    await gcalService.watchEvents(context, {
      channelId: "507f1f77bcf86cd799439011",
      expiration: new Date("2030-01-01T00:00:00.000Z").toISOString(),
      gCalendarId: "primary",
    });

    expect(watch).toHaveBeenCalledWith(
      expect.objectContaining({
        calendarId: "primary",
        quotaUser: "user-1",
        requestBody: expect.objectContaining({
          address:
            "https://example.trycloudflare.com/api" +
            GCAL_NOTIFICATION_ENDPOINT,
          type: "web_hook",
        }),
      }),
    );
  });

  it("uses the Google webhook base URL for calendar list watch callback addresses", async () => {
    const watch = jest.fn().mockResolvedValue({
      status: 200,
      data: { id: "507f1f77bcf86cd799439011", resourceId: "resource-id" },
    });
    const context = {
      gcal: { calendarList: { watch } },
      quotaUser: "user-1",
    } as unknown as GoogleRequestContext;

    await gcalService.watchCalendars(context, {
      channelId: "507f1f77bcf86cd799439011",
      expiration: new Date("2030-01-01T00:00:00.000Z").toISOString(),
    });

    expect(watch).toHaveBeenCalledWith(
      expect.objectContaining({
        quotaUser: "user-1",
        requestBody: expect.objectContaining({
          address:
            "https://example.trycloudflare.com/api" +
            GCAL_NOTIFICATION_ENDPOINT,
          type: "web_hook",
        }),
      }),
    );
  });

  it("forwards quotaUser into the underlying googleapis call", async () => {
    const list = jest.fn().mockResolvedValue({
      status: 200,
      data: { items: [] },
    });
    const context = {
      gcal: { events: { list } },
      quotaUser: "stable-user-id",
    } as unknown as GoogleRequestContext;

    await gcalService.getEvents(context, { calendarId: "primary" });

    expect(list).toHaveBeenCalledWith(
      expect.objectContaining({
        calendarId: "primary",
        quotaUser: "stable-user-id",
      }),
    );
  });

  it("retries a retryable failure via withGoogleRetry and eventually succeeds", async () => {
    const rateLimitError = new GaxiosError(
      "rate limited",
      { headers: new Headers(), url: new URL("https://example.com") },
      {
        status: 429,
        statusText: "",
        headers: new Headers(),
        config: {
          headers: new Headers(),
          url: new URL("https://example.com"),
        },
        data: {},
      } as unknown as GaxiosResponse,
    );

    const list = jest
      .fn()
      .mockRejectedValueOnce(rateLimitError)
      .mockResolvedValueOnce({ status: 200, data: { items: [] } });
    const context = {
      gcal: { events: { list } },
      quotaUser: "user-1",
    } as unknown as GoogleRequestContext;

    const result = await gcalService.getEvents(context, {
      calendarId: "primary",
    });

    expect(list).toHaveBeenCalledTimes(2);
    expect(result.data).toEqual({ items: [] });
  });
});

describe("gcal.service getAllCalendarListPages", () => {
  it("follows nextPageToken across pages and only returns nextSyncToken from the final page", async () => {
    const list = jest
      .fn()
      .mockResolvedValueOnce({
        status: 200,
        data: { items: [{ id: "cal-1" }], nextPageToken: "page-2" },
      })
      .mockResolvedValueOnce({
        status: 200,
        data: { items: [{ id: "cal-2" }], nextSyncToken: "final-token" },
      });
    const context = {
      gcal: { calendarList: { list } },
      quotaUser: "user-1",
    } as unknown as GoogleRequestContext;

    const pages = [];

    for await (const page of gcalService.getAllCalendarListPages(context)) {
      pages.push(page);
    }

    expect(list).toHaveBeenCalledTimes(2);
    expect(list).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ pageToken: "page-2" }),
    );
    expect(pages.map((p) => p.nextSyncToken)).toEqual([
      undefined,
      "final-token",
    ]);
    expect(pages.flatMap((p) => p.items ?? [])).toEqual([
      { id: "cal-1" },
      { id: "cal-2" },
    ]);
  });

  it("defaults a page's items to an empty array when Google omits them", async () => {
    const list = jest.fn().mockResolvedValueOnce({
      status: 200,
      data: { nextSyncToken: "final-token" },
    });
    const context = {
      gcal: { calendarList: { list } },
      quotaUser: "user-1",
    } as unknown as GoogleRequestContext;

    const pages = [];

    for await (const page of gcalService.getAllCalendarListPages(context)) {
      pages.push(page);
    }

    expect(pages).toEqual([{ items: [], nextSyncToken: "final-token" }]);
  });

  it("throws PaginationNotSupported when the final page has neither a nextPageToken nor a nextSyncToken", async () => {
    const list = jest.fn().mockResolvedValueOnce({
      status: 200,
      data: { items: [{ id: "cal-1" }] },
    });
    const context = {
      gcal: { calendarList: { list } },
      quotaUser: "user-1",
    } as unknown as GoogleRequestContext;

    const drain = async () => {
      for await (const _page of gcalService.getAllCalendarListPages(context)) {
        // draining the generator
      }
    };

    await expect(drain()).rejects.toThrow(/sync token/i);
  });
});

describe("gcal.service quotaUser passthrough (packet 07 step 7 pin)", () => {
  const QUOTA_USER = "user-123";
  const CHANNEL_ID = "507f1f77bcf86cd799439011";

  // One shared context for the whole table: `clearMocks` (jest.config.js)
  // wipes each jest.fn()'s recorded calls between tests, so reusing these
  // mocks across `it.each` cases below doesn't leak call history.
  const context = {
    gcal: {
      events: {
        get: jest.fn().mockResolvedValue({ status: 200, data: {} }),
        insert: jest.fn().mockResolvedValue({ status: 200, data: {} }),
        delete: jest.fn().mockResolvedValue({ status: 204, data: {} }),
        instances: jest
          .fn()
          .mockResolvedValue({ status: 200, data: { items: [] } }),
        list: jest.fn().mockResolvedValue({
          status: 200,
          data: { items: [], nextSyncToken: "sync-token" },
        }),
        patch: jest.fn().mockResolvedValue({ status: 200, data: {} }),
        watch: jest.fn().mockResolvedValue({
          status: 200,
          data: { resourceId: "resource-1" },
        }),
      },
      calendarList: {
        list: jest.fn().mockResolvedValue({
          status: 200,
          data: { items: [], nextSyncToken: "sync-token" },
        }),
        watch: jest.fn().mockResolvedValue({
          status: 200,
          data: { resourceId: "resource-1" },
        }),
      },
      channels: {
        stop: jest.fn().mockResolvedValue({ status: 204, data: {} }),
      },
      freebusy: {
        query: jest
          .fn()
          .mockResolvedValue({ status: 200, data: { calendars: {} } }),
      },
    },
    quotaUser: QUOTA_USER,
  } as unknown as GoogleRequestContext;

  // getEventInstances is a private method (TS-only), but it does call
  // Google directly, so the packet asks for it to be covered too -- this
  // narrow cast is the only way to reach it from outside the class. Kept as
  // a property on the cast object (not destructured) so the call below
  // still goes through `obj.method(...)` and keeps its `this` binding.
  const gcalServiceInternal = gcalService as unknown as {
    getEventInstances: (
      ctx: GoogleRequestContext,
      calendarId: string,
      eventId: string,
    ) => Promise<unknown>;
  };

  // Every GCalService method that reaches Google, paired with a call
  // exercising it and the underlying client mock it should reach. A flat
  // table (not a loop deriving calls from method names) so a signature
  // mismatch fails as a normal assertion, not a runtime crash.
  const cases: Array<{
    method: string;
    call: () => Promise<unknown>;
    mock: () => jest.Mock;
  }> = [
    {
      method: "getEvent",
      call: () => gcalService.getEvent(context, "event-1"),
      mock: () => context.gcal.events.get as jest.Mock,
    },
    {
      method: "createEvent",
      call: () =>
        gcalService.createEvent(context, "cal-1", {} as gSchema$Event),
      mock: () => context.gcal.events.insert as jest.Mock,
    },
    {
      method: "deleteEvent",
      call: () => gcalService.deleteEvent(context, "cal-1", "event-1"),
      mock: () => context.gcal.events.delete as jest.Mock,
    },
    {
      method: "getEventInstances",
      call: () =>
        gcalServiceInternal.getEventInstances(context, "cal-1", "event-1"),
      mock: () => context.gcal.events.instances as jest.Mock,
    },
    {
      method: "findEventInstance",
      call: () =>
        gcalService.findEventInstance(context, "cal-1", "event-1", new Date()),
      mock: () => context.gcal.events.instances as jest.Mock,
    },
    {
      method: "getEvents",
      call: () => gcalService.getEvents(context, { calendarId: "cal-1" }),
      mock: () => context.gcal.events.list as jest.Mock,
    },
    {
      method: "queryFreeBusy",
      call: () =>
        gcalService.queryFreeBusy(context, {
          timeMin: "2024-01-01T00:00:00.000Z",
          timeMax: "2024-01-02T00:00:00.000Z",
          gCalendarIds: ["cal-1"],
        }),
      mock: () => context.gcal.freebusy.query as jest.Mock,
    },
    {
      method: "patchEvent",
      call: () =>
        gcalService.patchEvent(
          context,
          "cal-1",
          "event-1",
          {} as gSchema$Event,
        ),
      mock: () => context.gcal.events.patch as jest.Mock,
    },
    {
      method: "watchCalendars",
      call: () =>
        gcalService.watchCalendars(context, {
          channelId: CHANNEL_ID,
          expiration: "123",
        }),
      mock: () => context.gcal.calendarList.watch as jest.Mock,
    },
    {
      method: "watchEvents",
      call: () =>
        gcalService.watchEvents(context, {
          channelId: CHANNEL_ID,
          expiration: "123",
          gCalendarId: "cal-1",
        }),
      mock: () => context.gcal.events.watch as jest.Mock,
    },
    {
      method: "stopWatch",
      call: () =>
        gcalService.stopWatch(context, {
          channelId: "channel-1",
          resourceId: "resource-1",
        }),
      mock: () => context.gcal.channels.stop as jest.Mock,
    },
    {
      method: "getAllEvents",
      call: async () => {
        for await (const _page of gcalService.getAllEvents({
          context,
          calendarId: "cal-1",
        })) {
          break;
        }
      },
      mock: () => context.gcal.events.list as jest.Mock,
    },
    {
      method: "getAllCalendarListPages",
      call: async () => {
        for await (const _page of gcalService.getAllCalendarListPages(
          context,
        )) {
          break;
        }
      },
      mock: () => context.gcal.calendarList.list as jest.Mock,
    },
  ];

  it.each(cases)("passes quotaUser through $method", async ({ call, mock }) => {
    await call();

    expect(mock()).toHaveBeenCalledWith(
      expect.objectContaining({ quotaUser: QUOTA_USER }),
    );
  });

  // Not covered above by design: validateGCalResponse never calls Google
  // (it only inspects a response already received), and
  // getBaseRecurringEventInstances is a thin generator wrapper around the
  // already-covered getEventInstances.
  const ACKNOWLEDGED_WITHOUT_OWN_CASE = [
    "validateGCalResponse",
    "getBaseRecurringEventInstances",
  ];

  /**
   * GCalService's arrow-field methods (watchCalendars, watchEvents,
   * stopWatch) are own properties of the instance; its regular `async`
   * methods live on the prototype instead -- both have to be walked to see
   * the whole method surface.
   */
  const listMethodNames = (instance: object): string[] => {
    const ownNames = Object.getOwnPropertyNames(instance);
    const proto = Object.getPrototypeOf(instance) as object | null;
    const protoNames =
      proto && proto !== Object.prototype
        ? Object.getOwnPropertyNames(proto).filter(
            (name) => name !== "constructor",
          )
        : [];

    return [...new Set([...ownNames, ...protoNames])].filter(
      (name) =>
        typeof (instance as Record<string, unknown>)[name] === "function",
    );
  };

  it("covers every GCalService method (fails loudly if a new one is added without updating this table)", () => {
    const actualMethodNames = listMethodNames(gcalService);
    const coveredMethodNames = [
      ...cases.map((c) => c.method),
      ...ACKNOWLEDGED_WITHOUT_OWN_CASE,
    ];

    expect(new Set(actualMethodNames)).toEqual(new Set(coveredMethodNames));
  });
});
