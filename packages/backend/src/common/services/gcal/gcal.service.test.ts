jest.mock("@backend/common/constants/config.constants", () => ({
  CONFIG: { GCAL_WEBHOOK_BASEURL: "https://example.trycloudflare.com/api" },
}));

jest.mock("@backend/sync/services/watch/google-watch-token", () => ({
  encodeChannelToken: jest.fn(() => "encoded-token"),
}));

import { GaxiosError, type GaxiosResponse } from "gaxios";
import { GCAL_NOTIFICATION_ENDPOINT } from "@core/constants/core.constants";
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
