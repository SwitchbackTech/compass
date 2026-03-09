import { Origin } from "@core/constants/core.constants";
import { type Entities_Event } from "@web/ducks/events/event.types";
import { eventsEntitiesSlice } from "./event.slice";

describe("eventsEntitiesSlice", () => {
  describe("removeEventsByOrigin", () => {
    it("does not throw when value is missing", () => {
      const action = eventsEntitiesSlice.actions.removeEventsByOrigin({
        origins: [Origin.GOOGLE, Origin.GOOGLE_IMPORT],
      });

      expect(() =>
        eventsEntitiesSlice.reducer({} as { value: Entities_Event }, action),
      ).not.toThrow();
    });

    it("removes only events from the provided origins", () => {
      const action = eventsEntitiesSlice.actions.removeEventsByOrigin({
        origins: [Origin.GOOGLE, Origin.GOOGLE_IMPORT],
      });

      const nextState = eventsEntitiesSlice.reducer(
        {
          value: {
            local: { _id: "local", origin: Origin.COMPASS },
            google: { _id: "google", origin: Origin.GOOGLE },
            imported: { _id: "imported", origin: Origin.GOOGLE_IMPORT },
          },
        },
        action,
      );

      expect(nextState.value).toEqual({
        local: { _id: "local", origin: Origin.COMPASS },
      });
    });
  });
});
