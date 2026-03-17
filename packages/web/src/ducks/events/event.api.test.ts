import { RecurringEventUpdateScope } from "@core/types/event.types";
import { CompassApi } from "@web/common/apis/compass.api";
import { EventApi } from "./event.api";

describe("EventApi.delete", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("appends applyTo query param when provided", async () => {
    const deleteSpy = jest
      .spyOn(CompassApi, "delete")
      .mockResolvedValue({} as never);

    await EventApi.delete("event-1", RecurringEventUpdateScope.THIS_EVENT);

    expect(deleteSpy).toHaveBeenCalledWith(
      `/event/event-1?applyTo=${RecurringEventUpdateScope.THIS_EVENT}`,
    );
  });

  it("omits applyTo query param when not provided", async () => {
    const deleteSpy = jest
      .spyOn(CompassApi, "delete")
      .mockResolvedValue({} as never);

    await EventApi.delete("event-1");

    expect(deleteSpy).toHaveBeenCalledWith("/event/event-1");
  });
});
