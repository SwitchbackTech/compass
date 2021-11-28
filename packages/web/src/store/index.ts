import { configureStore } from '@reduxjs/toolkit';

import { sagaMiddleware } from '@common/store/middlewares';

import { reducers } from './reducers';

export const store = configureStore({
  reducer: reducers,
  middleware: [sagaMiddleware],
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
