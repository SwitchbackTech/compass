import { Categories_Event } from "@core/types/event.types";
import dayjs from "@core/util/date/dayjs";
import { draftSlice } from "@web/ducks/events/slices/draft.slice";
import { type Activity_DraftEvent } from "@web/ducks/events/slices/draft.slice.types";
import { beforeEach, describe, expect, it, mock } from "bun:test";

mock.module("@web/auth/compass/session/session.util", () => ({
  getUserId: mock().mockResolvedValue("mock-user"),
}));

const { createSomedayDraft } =
  require("@web/common/utils/draft/someday.draft.util") as typeof import("@web/common/utils/draft/someday.draft.util");

describe("createSomedayDraft", () => {
  const mockDispatch = mock();
  const mockActivity: Activity_DraftEvent = "sidebarClick";

  beforeEach(() => {
    mockDispatch.mockClear();
  });

  it("should set correct dates for week category", async () => {
    const startOfView = dayjs("2024-03-10"); // A Sunday
    const endOfView = startOfView.add(6, "days"); // Saturday

    await createSomedayDraft(
      Categories_Event.SOMEDAY_WEEK,
      startOfView,
      endOfView,
      mockActivity,
      mockDispatch,
    );

    const expectedStart = "2024-03-10";
    const expectedEnd = "2024-03-16";

    expect(mockDispatch).toHaveBeenCalledWith(
      draftSlice.actions.start({
        activity: mockActivity,
        eventType: Categories_Event.SOMEDAY_WEEK,
        event: expect.objectContaining({
          user: "mock-user",
          startDate: expectedStart,
          endDate: expectedEnd,
          isAllDay: false,
          isSomeday: true,
        }),
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
      mockDispatch,
    );

    const expectedStart = "2024-02-01";
    const expectedEnd = "2024-02-29";

    expect(mockDispatch).toHaveBeenCalledWith(
      draftSlice.actions.start({
        activity: mockActivity,
        eventType: Categories_Event.SOMEDAY_MONTH,
        event: expect.objectContaining({
          user: "mock-user",
          startDate: expectedStart,
          endDate: expectedEnd,
          isAllDay: false,
          isSomeday: true,
        }),
      }),
    );
  });
});
