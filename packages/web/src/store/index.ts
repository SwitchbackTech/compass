import { configureStore } from "@reduxjs/toolkit";
import { sagaMiddleware } from "@web/common/store/middlewares";
import { reducers } from "./reducers";

export const store = configureStore({
  reducer: reducers,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(sagaMiddleware),
});

// Expose store for e2e testing (always expose, let tests opt-in via flag)
if (typeof window !== "undefined") {
  (window as any).__COMPASS_STORE__ = store;
}

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
