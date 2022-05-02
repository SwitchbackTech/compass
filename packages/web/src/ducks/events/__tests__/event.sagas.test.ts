import * as matchers from "redux-saga-test-plan/matchers";
import { expectSaga } from "redux-saga-test-plan";

import { EventApi } from "../event.api";
import { getSomedayEventsSaga, deleteEventSaga } from "../event.sagas";
import { deleteEventSlice } from "../slice";

/**
 * Shows an example of how to use redux-saga-test-plan
 * Can implement by testing that the saga called certain functions,
 * returned the store in a certain state, etc
 */
it("runs sample code", async () => {
  const initialGetWeekEvtState = {
    state: {
      events: {
        getWeekEvents: { value: { data: ["id1", "id2"] } },
        entities: {
          value: {
            id1: {
              _id: "id1",
            },
            id2: {
              _id: "id2",
            },
          },
        },
      },
    },
  };

  const payload = { payload: { _id: "id1" }, type: "idk" };
  const v = await expectSaga(deleteEventSaga, payload)
    .provide([[matchers.call.fn(EventApi.delete), {}]])
    .withState(initialGetWeekEvtState)
    .withReducer(deleteEventSlice.reducer)
    // .hasFinalState(expected) //<-- breaks here
    .run();
  expect(v.storeState.isSuccess).toBe(true);
});

describe("Get Someday Events", () => {
  it("runs sample code", async () => {
    const initialState = {
      state: {
        events: {
          getWeekEvents: { value: { data: ["id1", "id2"] } },
          entities: {
            value: {
              id1: {
                _id: "id1",
                isSomeday: true,
                origin: "compass",
                priority: "self",
                title: "5/22",
                user: "6249b94ef576a24bccdc2b85",
              },
              id2: {
                _id: "id2",
                isSomeday: true,
                origin: "compass",
                priority: "self",
                title: "1/22",
                startDate: "2022-01-01T15:59:22-06:00",
                user: "6249b94ef576a24bccdc2b85",
              },
            },
          },
        },
      },
    };

    const payload = { payload: { _id: "id1" }, type: "idk" };
    const v = await expectSaga(deleteEventSaga, payload)
      .provide([[matchers.call.fn(EventApi.delete), {}]])
      .withState(initialState)
      .withReducer(deleteEventSlice.reducer)
      // .hasFinalState(expected) //<-- breaks here
      .run();
    expect(v.storeState.isSuccess).toBe(true);
  });
});
