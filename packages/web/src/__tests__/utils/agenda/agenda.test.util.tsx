import "@testing-library/jest-dom";
import { Schema_Event } from "@core/types/event.types";
import { createStoreWithEvents } from "@web/__tests__/utils/state/store.test.util";
import * as eventSelectors from "@web/ducks/events/selectors/event.selectors";
import * as reduxStore from "@web/store";
import { store } from "@web/store";
import { Agenda } from "@web/views/Day/components/Agenda/Agenda";
import { renderWithDayProviders } from "@web/views/Day/util/day.test-util";

export const selectIsDayEventsProcessingSpy = jest.spyOn(
  eventSelectors,
  "selectIsDayEventsProcessing",
);

export const renderAgenda = (
  events: Schema_Event[] = [],
  options?: { isProcessing?: boolean },
) => {
  selectIsDayEventsProcessingSpy.mockReturnValue(!!options?.isProcessing);

  const newStore = createStoreWithEvents(events, options);

  jest.replaceProperty(
    reduxStore,
    "store",
    newStore as unknown as typeof reduxStore.store,
  );

  const utils = renderWithDayProviders(<Agenda />, { store });
  return { ...utils, store };
};
