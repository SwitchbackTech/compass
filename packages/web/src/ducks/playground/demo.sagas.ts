import { put, call } from 'redux-saga/effects';

export const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

export function* incrementAsync() {
  yield call(delay, 1000);
  yield put({ type: 'INCREMENT' });
}
