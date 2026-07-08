import { HotkeyManager } from "@tanstack/react-hotkeys";
import { Categories_Event, type Schema_Event } from "@core/types/event.types";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@web/__tests__/__mocks__/mock.render";
import { toNormalizedEventQueryData } from "@web/__tests__/utils/event-query-test-data";
import { createCompassQueryClient } from "@web/common/query/query-client";
import { FloatingEventForm } from "@web/components/FloatingEventForm/FloatingEventForm";
import { eventQueryKeys } from "@web/events/queries/event.query.keys";
import { draftActions } from "@web/events/stores/draft.store";
import { useEventForm } from "@web/views/Forms/hooks/useEventForm";
import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import "@testing-library/jest-dom";

const draft: Schema_Event = {
  endDate: "2026-05-21",
  isAllDay: true,
  isSomeday: false,
  startDate: "2026-05-20",
  title: "",
  user: "user",
};

beforeEach(() => {
  HotkeyManager.resetInstance();
  draftActions.discard();
});

afterEach(() => {
  cleanup();
});

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

  it("deletes an already-saved event on Delete instead of just closing the form", async () => {
    const existingEvent: Schema_Event = {
      _id: "existing-event-id",
      endDate: "2026-05-20T15:00:00.000Z",
      isAllDay: false,
      isSomeday: false,
      startDate: "2026-05-20T14:00:00.000Z",
      title: "Existing Event",
      user: "user",
    };

    const queryClient = createCompassQueryClient();
    queryClient.setQueryData(
      eventQueryKeys.day({
        source: "local",
        startDate: "2026-05-20T00:00:00.000Z",
        endDate: "2026-05-21T00:00:00.000Z",
      }),
      toNormalizedEventQueryData([existingEvent]),
    );

    draftActions.start({
      activity: "keyboardEdit",
      event: existingEvent,
      eventType: Categories_Event.TIMED,
    });
    draftActions.setFormOpen(true);

    const Harness = () => {
      const form = useEventForm(Categories_Event.TIMED, true, () => undefined);

      return (
        <>
          <button ref={form.refs.setReference} type="button">
            Existing event
          </button>
          <FloatingEventForm form={form} />
        </>
      );
    };

    render(<Harness />, { queryClient });

    const titleField = await screen.findByPlaceholderText("Title");
    await waitFor(() => expect(titleField).toHaveFocus());

    // A real keyboard user moves focus off the title text field before
    // Delete deletes the event, rather than editing the title text.
    titleField.blur();

    fireEvent.keyDown(screen.getByRole("form"), {
      bubbles: true,
      cancelable: true,
      key: "Delete",
    });

    // A delete mutation only fires on the real-delete branch
    // (`handleEventFormDelete` calling `onDelete`), never on the draft-close
    // branch (`onClose` only) — so this pins FloatingEventForm computing
    // isDraft from whether the event already exists, not hardcoding it to
    // true for every opened event.
    await waitFor(() =>
      expect(
        queryClient
          .getMutationCache()
          .getAll()
          .some(
            (mutation) =>
              mutation.options.mutationKey?.[2] === "delete" &&
              (mutation.state.variables as { _id?: string })._id ===
                "existing-event-id",
          ),
      ).toBe(true),
    );
  });
});
