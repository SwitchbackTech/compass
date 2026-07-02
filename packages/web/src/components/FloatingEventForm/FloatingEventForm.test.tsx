import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { Categories_Event, type Schema_Event } from "@core/types/event.types";
import { createStoreWithEvents } from "@web/__tests__/utils/state/store.test.util";
import { FloatingEventForm } from "@web/components/FloatingEventForm/FloatingEventForm";
import { draftSlice } from "@web/ducks/events/slices/draft.slice";
import { useEventForm } from "@web/views/Forms/hooks/useEventForm";
import { afterEach, describe, expect, it } from "bun:test";
import "@testing-library/jest-dom";

const draft: Schema_Event = {
  endDate: "2026-05-21",
  isAllDay: true,
  isSomeday: false,
  startDate: "2026-05-20",
  title: "",
  user: "user",
};

afterEach(cleanup);

describe("FloatingEventForm", () => {
  it("focuses the title when the form opens", async () => {
    const store = createStoreWithEvents([]);
    store.dispatch(draftSlice.actions.startGridClick(draft));
    store.dispatch(draftSlice.actions.setFormOpen(true));

    const Harness = () => {
      const form = useEventForm(Categories_Event.ALLDAY, true, () => undefined);

      return (
        <>
          <button ref={form.refs.setReference} type="button">
            Draft event
          </button>
          <FloatingEventForm form={form} />
        </>
      );
    };

    render(
      <Provider store={store}>
        <Harness />
      </Provider>,
    );

    await waitFor(() =>
      expect(screen.getByPlaceholderText("Title")).toHaveFocus(),
    );
  });
});
