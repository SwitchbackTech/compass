// import { eventsSagas } from '@web/ducks/events/sagas';

import { eventsApi } from "./api";
import { getEventsLocalStorage } from "./fakeApi";

test("idk", async () => {
  // const evts = eventsSagas();
  const evts = await eventsApi.getEvents({});
  const localEvts = await getEventsLocalStorage();
  //   const evts = eventsSagas()
  expect(1).toEqual(1);
  //   expect(gen.next().value).toEqual(call(delay, 1000))
});
