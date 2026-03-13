import { Origin } from "@core/constants/core.constants";
import { type Schema_Event } from "@core/types/event.types";
import { eventsEntitiesSlice } from "./event.slice";

const createEvent = (id: string, origin: Origin) =>
  ({ _id: id, origin }) as unknown as Schema_Event;

describe("eventsEntitiesSlice", () => {
  describe("removeEventsByOrigin", () => {
    it("initializes value when reducer state is undefined", () => {
      const state = eventsEntitiesSlice.reducer(undefined, { type: "@@INIT" });

      expect(state).toEqual({ value: {} });
    });

    it("does not throw when value is missing", () => {
      const action = eventsEntitiesSlice.actions.removeEventsByOrigin({
        origins: [Origin.GOOGLE],
      });

      const state = eventsEntitiesSlice.reducer({} as never, action);

      expect(state).toEqual({ value: {} });
    });

    it("removes only events that match the provided origins", () => {
      const initialState = {
        value: {
          "google-1": createEvent("google-1", Origin.GOOGLE),
          "import-1": createEvent("import-1", Origin.GOOGLE_IMPORT),
          "compass-1": createEvent("compass-1", Origin.COMPASS),
        },
      };

      const state = eventsEntitiesSlice.reducer(
        initialState as never,
        eventsEntitiesSlice.actions.removeEventsByOrigin({
          origins: [Origin.GOOGLE, Origin.GOOGLE_IMPORT],
        }),
      );

      expect(state.value["google-1"]).toBeUndefined();
      expect(state.value["import-1"]).toBeUndefined();
      expect(state.value["compass-1"]).toBeDefined();
    });
  });
});
