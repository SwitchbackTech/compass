import { registerEventListeners } from "@web/ducks/events/listeners/event.listeners";
import {
  createEventSlice,
  deleteEventSlice,
  editEventSlice,
} from "@web/ducks/events/slices/event.slice";
import { getSomedayEventsSlice } from "@web/ducks/events/slices/someday.slice";
import { getWeekEventsSlice } from "@web/ducks/events/slices/week.slice";
import { describe, expect, test } from "bun:test";

describe("registerEventListeners", () => {
  test("registers only event mutation actions (reads are TanStack Query)", () => {
    const actionTypes: string[] = [];
    const startListening = ((config: { actionCreator: { type: string } }) =>
      actionTypes.push(config.actionCreator.type)) as never;

    registerEventListeners(startListening);

    expect(actionTypes).toEqual([
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
