import { type RootState } from "@web/store";
import {
  selectAllDayDayEvents,
  selectDayEvents,
  selectEventEntities,
  selectTimedDayEvents,
} from "./event.selectors";

const createDayRefreshStateBeforeEventsLoad = (): RootState =>
  ({
    events: {
      entities: {},
      getDayEvents: {
        value: null,
      },
    },
  }) as RootState;

const dayViewRefreshSelectors: Array<[string, (state: RootState) => unknown]> =
  [
    ["event entities", selectEventEntities],
    ["day events", selectDayEvents],
    ["timed day events", selectTimedDayEvents],
    ["all-day day events", selectAllDayDayEvents],
  ];

describe("Day View event selector stability", () => {
  it.each(
    dayViewRefreshSelectors,
  )("keeps %s stable before the event request succeeds", (_label, selector) => {
    const state = createDayRefreshStateBeforeEventsLoad();
    const selected = selector(state);

    expect(selector(state)).toBe(selected);
  });
});
