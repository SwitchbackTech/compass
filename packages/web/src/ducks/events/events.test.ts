// import { eventsSagas } from '@ducks/events/sagas';

import { eventsApi, getEventsLocalStorage } from "./api";

test("idk", async () => {
  // const evts = eventsSagas();
  const evts = await eventsApi.getEvents({});
  const localEvts = await getEventsLocalStorage();
  //   const evts = eventsSagas()
  expect(1).toEqual(1);
  //   expect(gen.next().value).toEqual(call(delay, 1000))
});
