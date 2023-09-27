import { all } from "@redux-saga/core/effects";
import { eventsSagas } from "@web/ducks/events/sagas/event.sagas";

export function* sagas() {
  yield all([eventsSagas()]);
}
