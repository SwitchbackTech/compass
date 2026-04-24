jest.mock("@backend/common/util/api-base-url.util", () => ({
  getGcalWebhookBaseURL: jest.fn(() => "https://example.trycloudflare.com/api"),
}));

jest.mock("@backend/sync/util/watch.util", () => ({
  encodeChannelToken: jest.fn(() => "encoded-token"),
}));

import { GCAL_NOTIFICATION_ENDPOINT } from "@core/constants/core.constants";
import gcalService from "./gcal.service";

describe("gcal.service watch callbacks", () => {
  it("uses the Google webhook base URL for event watch callback addresses", async () => {
    const watch = jest.fn().mockResolvedValue({
      status: 200,
      data: { id: "507f1f77bcf86cd799439011", resourceId: "resource-id" },
    });

    await gcalService.watchEvents(
      { events: { watch } } as never,
      {
        channelId: "507f1f77bcf86cd799439011",
        expiration: new Date("2030-01-01T00:00:00.000Z"),
        gCalendarId: "primary",
      },
    );

    expect(watch).toHaveBeenCalledWith(
      expect.objectContaining({
        calendarId: "primary",
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

    await gcalService.watchCalendars(
      { calendarList: { watch } } as never,
      {
        channelId: "507f1f77bcf86cd799439011",
        expiration: new Date("2030-01-01T00:00:00.000Z"),
      },
    );

    expect(watch).toHaveBeenCalledWith(
      expect.objectContaining({
        requestBody: expect.objectContaining({
          address:
            "https://example.trycloudflare.com/api" +
            GCAL_NOTIFICATION_ENDPOINT,
          type: "web_hook",
        }),
      }),
    );
  });
});
