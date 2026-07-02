import { createCompassQueryClient } from "@web/common/query/query-client";
import { viewSlice } from "@web/ducks/events/slices/view.slice";
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

    first.dispatch(viewSlice.actions.toggleSidebar());

    expect(first).not.toBe(second);
    expect(first.getState().view.sidebar.isOpen).toBe(false);
    expect(second.getState().view.sidebar.isOpen).toBe(true);
  });
});
