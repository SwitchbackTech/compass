import { all } from "@redux-saga/core/effects";
import { authSagas } from "@web/ducks/auth/auth.sagas";
import { eventsSagas } from "@web/ducks/events/sagas/event.sagas";

export function* sagas() {
  yield all([authSagas(), eventsSagas()]);
}
