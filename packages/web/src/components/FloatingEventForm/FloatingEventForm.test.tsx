import { Categories_Event, type Schema_Event } from "@core/types/event.types";
import {
  cleanup,
  render,
  screen,
  waitFor,
} from "@web/__tests__/__mocks__/mock.render";
import { FloatingEventForm } from "@web/components/FloatingEventForm/FloatingEventForm";
import { draftActions } from "@web/events/stores/draft.store";
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
    draftActions.startGridClick(draft);
    draftActions.setFormOpen(true);

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

    render(<Harness />);

    await waitFor(() =>
      expect(screen.getByPlaceholderText("Title")).toHaveFocus(),
    );
  });
});
