import { all } from '@redux-saga/core/effects';

import { authSagas } from '@ducks/auth/auth.sagas';
import { eventsSagas } from '@ducks/events/sagas';

export function* sagas() {
  yield all([authSagas(), eventsSagas()]);
}
