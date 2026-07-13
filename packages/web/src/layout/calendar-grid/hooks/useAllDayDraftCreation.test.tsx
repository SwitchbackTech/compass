import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { useEffect } from "react";
import { type Schema_Event } from "@core/types/event.types";
import { type GridEventDraft } from "@web/events/event-draft.types";
import { draftActions, useDraftStore } from "@web/events/stores/draft.store";
import { useAllDayDraftCreation } from "./useAllDayDraftCreation";
import { afterEach, describe, expect, it, mock } from "bun:test";

mock.module("@web/auth/compass/session/session.util", () => ({
  getUserId: mock().mockResolvedValue("user"),
}));

const existingDraft: Schema_Event = {
  _id: "existing-draft",
  endDate: "2026-05-21",
  isAllDay: true,
  startDate: "2026-05-20",
  title: "Existing draft",
  user: "user",
};

const renderHarness = ({
  draft = null,
  onCreateGridDraft = mock(),
  onParentMouseDown = mock(),
}: {
  draft?: Schema_Event | null;
  onCreateGridDraft?: (draft: GridEventDraft) => void;
  onParentMouseDown?: () => void;
} = {}) => {
  if (draft) {
    draftActions.startGridClick(draft);
  }

  const Harness = () => {
    const onMouseDown = useAllDayDraftCreation({
      getStartDate: () => "2026-05-20",
      onCreateGridDraft,
    });

    useEffect(() => {
      document.addEventListener("mousedown", onParentMouseDown);
      return () => document.removeEventListener("mousedown", onParentMouseDown);
    }, []);

    return (
      <button onMouseDown={onMouseDown} type="button">
        Empty all-day space
      </button>
    );
  };

  render(<Harness />);

  return { onCreateGridDraft, onParentMouseDown };
};

afterEach(cleanup);

describe("useAllDayDraftCreation", () => {
  it("creates a one-day all-day draft and stops the opening press", async () => {
    const { onCreateGridDraft, onParentMouseDown } = renderHarness();

    const wasNotCancelled = fireEvent.mouseDown(
      screen.getByRole("button", { name: "Empty all-day space" }),
      { button: 0 },
    );

    expect(wasNotCancelled).toBe(false);
    expect(onParentMouseDown).not.toHaveBeenCalled();
    await waitFor(() => expect(onCreateGridDraft).toHaveBeenCalledTimes(1));
    expect(onCreateGridDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        values: expect.objectContaining({
          schedule: {
            end: new Date("2026-05-21"),
            kind: "allDay",
            start: new Date("2026-05-20"),
          },
        }),
      }),
    );
  });

  it("ignores right-click presses", () => {
    const { onCreateGridDraft, onParentMouseDown } = renderHarness();

    fireEvent.mouseDown(
      screen.getByRole("button", { name: "Empty all-day space" }),
      { button: 2 },
    );

    expect(onCreateGridDraft).not.toHaveBeenCalled();
    expect(onParentMouseDown).toHaveBeenCalledTimes(1);
  });

  it("dismisses an existing draft without creating a replacement", async () => {
    const { onCreateGridDraft, onParentMouseDown } = renderHarness({
      draft: existingDraft,
    });

    fireEvent.mouseDown(
      screen.getByRole("button", { name: "Empty all-day space" }),
      { button: 0 },
    );

    await waitFor(() => expect(useDraftStore.getState().event).toBeNull());
    expect(onCreateGridDraft).not.toHaveBeenCalled();
    expect(onParentMouseDown).not.toHaveBeenCalled();
  });
});
