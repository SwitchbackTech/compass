import { Categories_Event } from "@core/types/event.types";
import dayjs from "@core/util/date/dayjs";
import {
  type Activity_DraftEvent,
  useDraftStore,
} from "@web/events/stores/draft.store";
import { describe, expect, it, mock } from "bun:test";

mock.module("@web/auth/compass/session/session.util", () => ({
  getUserId: mock().mockResolvedValue("mock-user"),
}));

const { createSomedayDraft } =
  require("@web/common/utils/draft/someday.draft.util") as typeof import("@web/common/utils/draft/someday.draft.util");

describe("createSomedayDraft", () => {
  const mockActivity: Activity_DraftEvent = "sidebarClick";

  it("should set correct dates for week category", async () => {
    const startOfView = dayjs("2024-03-10"); // A Sunday
    const endOfView = startOfView.add(6, "days"); // Saturday

    await createSomedayDraft(
      Categories_Event.SOMEDAY_WEEK,
      startOfView,
      endOfView,
      mockActivity,
    );

    const { event, status } = useDraftStore.getState();

    expect(status?.activity).toBe(mockActivity);
    expect(status?.eventType).toBe(Categories_Event.SOMEDAY_WEEK);
    expect(event).toEqual(
      expect.objectContaining({
        user: "mock-user",
        startDate: "2024-03-10",
        endDate: "2024-03-16",
        isAllDay: false,
        isSomeday: true,
      }),
    );
  });

  it("should set correct dates for month category", async () => {
    const startOfView = dayjs("2024-02-29"); // Leap year February
    const endOfView = startOfView.add(6, "days"); // Crosses into March but should be ignored

    await createSomedayDraft(
      Categories_Event.SOMEDAY_MONTH,
      startOfView,
      endOfView,
      mockActivity,
    );

    const { event, status } = useDraftStore.getState();

    expect(status?.activity).toBe(mockActivity);
    expect(status?.eventType).toBe(Categories_Event.SOMEDAY_MONTH);
    expect(event).toEqual(
      expect.objectContaining({
        user: "mock-user",
        startDate: "2024-02-01",
        endDate: "2024-02-29",
        isAllDay: false,
        isSomeday: true,
      }),
    );
  });
});
