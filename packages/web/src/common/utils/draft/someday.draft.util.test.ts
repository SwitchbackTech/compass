import dayjs from "dayjs";
import { Categories_Event } from "@core/types/event.types";
import { draftSlice } from "@web/ducks/events/slices/draft.slice";
import { Activity_DraftEvent } from "@web/ducks/events/slices/draft.slice.types";
import { assembleDefaultEvent } from "../event/event.util";
import { createSomedayDraft } from "./someday.draft.util";

// Mock assembleDefaultEvent since it makes external calls
jest.mock("../event/event.util", () => ({
  assembleDefaultEvent: jest
    .fn()
    .mockImplementation(async (category, startDate, endDate) => ({
      _id: "mock-id",
      user: "mock-user",
      title: "",
      startDate,
      endDate,
      isAllDay: false,
      isSomeday: true,
    })),
}));

describe("createSomedayDraft", () => {
  const mockDispatch = jest.fn();
  const mockActivity: Activity_DraftEvent = "sidebarClick";

  beforeEach(() => {
    jest.clearAllMocks();
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

    expect(assembleDefaultEvent).toHaveBeenCalledWith(
      Categories_Event.SOMEDAY_WEEK,
      expectedStart,
      expectedEnd,
    );

    expect(mockDispatch).toHaveBeenCalledWith(
      draftSlice.actions.start({
        activity: mockActivity,
        eventType: Categories_Event.SOMEDAY_WEEK,
        event: {
          _id: "mock-id",
          user: "mock-user",
          title: "",
          startDate: expectedStart,
          endDate: expectedEnd,
          isAllDay: false,
          isSomeday: true,
        },
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

    expect(assembleDefaultEvent).toHaveBeenCalledWith(
      Categories_Event.SOMEDAY_MONTH,
      expectedStart,
      expectedEnd,
    );

    expect(mockDispatch).toHaveBeenCalledWith(
      draftSlice.actions.start({
        activity: mockActivity,
        eventType: Categories_Event.SOMEDAY_MONTH,
        event: {
          _id: "mock-id",
          user: "mock-user",
          title: "",
          startDate: expectedStart,
          endDate: expectedEnd,
          isAllDay: false,
          isSomeday: true,
        },
      }),
    );
  });
});
