import { registerEventListeners } from "@web/ducks/events/listeners/event.listeners";
import { getDayEventsSlice } from "@web/ducks/events/slices/day.slice";
import {
  createEventSlice,
  deleteEventSlice,
  editEventSlice,
  getCurrentMonthEventsSlice,
} from "@web/ducks/events/slices/event.slice";
import { getSomedayEventsSlice } from "@web/ducks/events/slices/someday.slice";
import { getWeekEventsSlice } from "@web/ducks/events/slices/week.slice";
import { describe, expect, test } from "bun:test";

describe("registerEventListeners", () => {
  test("registers every event command action", () => {
    const actionTypes: string[] = [];
    const startListening = ((config: { actionCreator: { type: string } }) =>
      actionTypes.push(config.actionCreator.type)) as never;

    registerEventListeners(startListening);

    expect(actionTypes).toEqual([
      getDayEventsSlice.actions.request.type,
      getWeekEventsSlice.actions.request.type,
      getCurrentMonthEventsSlice.actions.request.type,
      getSomedayEventsSlice.actions.request.type,
      createEventSlice.actions.request.type,
      editEventSlice.actions.request.type,
      deleteEventSlice.actions.request.type,
      getWeekEventsSlice.actions.convert.type,
      getSomedayEventsSlice.actions.convert.type,
      getSomedayEventsSlice.actions.delete.type,
      getSomedayEventsSlice.actions.reorder.type,
    ]);
  });
});
