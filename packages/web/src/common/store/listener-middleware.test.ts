import { configureStore, createAction } from "@reduxjs/toolkit";
import { createCompassQueryClient } from "@web/common/query/query-client";
import { createCompassListenerMiddleware } from "./listener-middleware";
import { describe, expect, test } from "bun:test";

describe("createCompassListenerMiddleware", () => {
  test("observes actions with the injected query client", async () => {
    const queryClient = createCompassQueryClient();
    const listenerMiddleware = createCompassListenerMiddleware(queryClient);
    const probe = createAction("listener/probe");
    let observedClient: unknown;

    listenerMiddleware.startListening({
      actionCreator: probe,
      effect: (_action, listenerApi) => {
        observedClient = listenerApi.extra.queryClient;
      },
    });

    const store = configureStore({
      reducer: (state = {}) => state,
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware().prepend(listenerMiddleware.middleware),
    });

    store.dispatch(probe());
    await Promise.resolve();

    expect(observedClient).toBe(queryClient);
  });
});
