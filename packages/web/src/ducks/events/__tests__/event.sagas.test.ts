import * as matchers from "redux-saga-test-plan/matchers";
import { expectSaga } from "redux-saga-test-plan";

import { EventApi } from "../event.api";
import { deleteEventSaga } from "../event.sagas";
import { deleteEventSlice } from "../slice";

/**
 * Shows an example of how to use redux-saga-test-plan
 * Can implement by testing that the saga called certain functions,
 * returned the store in a certain state, etc
 */
it("runs sample code", async () => {
  const initialGetWeekEvtState = {
    state: {
      events: { getWeekEvents: { value: { data: ["id1", "id2"] } } },
    },
  };
  const expected = {
    state: {
      events: { getWeekEvents: { value: { data: ["id2"] } } },
    },
  };

  const payload = { payload: { _id: "id1" }, type: "idk" };
  const v = await expectSaga(deleteEventSaga, payload)
    .provide([[matchers.call.fn(EventApi.delete), {}]])
    .withState(initialGetWeekEvtState)
    .withReducer(deleteEventSlice.reducer)
    // .hasFinalState(expected)
    .run();
});
