import { RecurringEventUpdateScope } from "@core/types/event.types";
import { CompassApi } from "@web/common/apis/compass.api";
import { EventApi } from "./event.api";

describe("EventApi", () => {
  describe("delete", () => {
    it("includes applyTo in query string when provided", async () => {
      const deleteSpy = jest
        .spyOn(CompassApi, "delete")
        .mockResolvedValue({} as any);

      await EventApi.delete("event-1", RecurringEventUpdateScope.ALL_EVENTS);

      expect(deleteSpy).toHaveBeenCalledWith(
        `/event/event-1?applyTo=${RecurringEventUpdateScope.ALL_EVENTS}`,
      );
    });

    it("omits applyTo query string when undefined", async () => {
      const deleteSpy = jest
        .spyOn(CompassApi, "delete")
        .mockResolvedValue({} as any);

      await EventApi.delete("event-1");

      expect(deleteSpy).toHaveBeenCalledWith("/event/event-1");
    });
  });
});
