import { RecurringEventUpdateScope } from "@core/types/event.types";
import { CompassApi } from "@web/common/apis/compass.api";
import { EventApi } from "./event.api";

jest.mock("@web/common/apis/compass.api", () => ({
  CompassApi: {
    post: jest.fn(),
    delete: jest.fn(),
    put: jest.fn(),
    get: jest.fn(),
  },
}));

describe("EventApi.delete", () => {
  const mockDelete = CompassApi.delete as jest.MockedFunction<
    typeof CompassApi.delete
  >;

  beforeEach(() => {
    jest.clearAllMocks();
    mockDelete.mockResolvedValue({} as never);
  });

  it("omits applyTo query param when not provided", async () => {
    await EventApi.delete("event-1");

    expect(mockDelete).toHaveBeenCalledWith("/event/event-1");
  });

  it("includes applyTo query param when provided", async () => {
    await EventApi.delete("event-1", RecurringEventUpdateScope.ALL_EVENTS);

    expect(mockDelete).toHaveBeenCalledWith(
      `/event/event-1?applyTo=${RecurringEventUpdateScope.ALL_EVENTS}`,
    );
  });
});
