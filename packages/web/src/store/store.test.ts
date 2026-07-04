import { createCompassQueryClient } from "@web/common/query/query-client";
import { draftSlice } from "@web/ducks/events/slices/draft.slice";
import { createCompassStore } from "./index";
import { describe, expect, test } from "bun:test";

describe("createCompassStore", () => {
  test("creates isolated stores when given isolated query clients", () => {
    const first = createCompassStore({
      queryClient: createCompassQueryClient(),
    });
    const second = createCompassStore({
      queryClient: createCompassQueryClient(),
    });

    first.dispatch(draftSlice.actions.startDnd(undefined));

    expect(first).not.toBe(second);
    expect(first.getState().events.draft.status?.isDrafting).toBe(true);
    expect(second.getState().events.draft.status?.isDrafting).toBe(false);
  });
});
