import { put, takeLatest } from '@redux-saga/core/effects';

function* getOAuthDataSaga() {
  try {
    yield put('foo', 'bar');
  } catch (error) {
    yield put('foo.slice.error()');
  }
}

export function* authSagas() {
  yield takeLatest('fik', getOAuthDataSaga);
}
