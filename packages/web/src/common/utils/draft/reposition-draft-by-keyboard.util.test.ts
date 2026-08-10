import dayjs from "@core/util/date/dayjs";
import {
  createGridEventDraft,
  timedGridSchedule,
} from "@web/events/grid-event-draft.adapter";
import { repositionDraftByKeyboard } from "./reposition-draft-by-keyboard.util";
import { describe, expect, it } from "bun:test";

describe("repositionDraftByKeyboard", () => {
  it("moves a createShortcut timed draft by 15 minutes with ArrowDown", () => {
    const draft = createGridEventDraft(
      timedGridSchedule(
        new Date("2026-05-20T09:00:00.000"),
        new Date("2026-05-20T10:00:00.000"),
      ),
    );

    const next = repositionDraftByKeyboard({
      activity: "createShortcut",
      draft,
      key: "ArrowDown",
    });

    expect(dayjs(next?.values.schedule.start).format()).toBe(
      dayjs("2026-05-20T09:15:00.000").format(),
    );
  });

  it("returns null when the next start is outside the allowed range", () => {
    const draft = createGridEventDraft(
      timedGridSchedule(
        new Date("2026-05-20T09:00:00.000"),
        new Date("2026-05-20T10:00:00.000"),
      ),
    );

    const next = repositionDraftByKeyboard({
      activity: "createShortcut",
      draft,
      key: "ArrowRight",
      isStartAllowed: () => false,
    });

    expect(next).toBeNull();
  });

  it("returns null for activities that are not keyboard-repositionable", () => {
    const draft = createGridEventDraft(
      timedGridSchedule(
        new Date("2026-05-20T09:00:00.000"),
        new Date("2026-05-20T10:00:00.000"),
      ),
    );

    expect(
      repositionDraftByKeyboard({
        activity: "dnd",
        draft,
        key: "ArrowDown",
      }),
    ).toBeNull();
  });

  it("moves a keyboardPlace timed draft by 15 minutes with ArrowDown", () => {
    const draft = createGridEventDraft(
      timedGridSchedule(
        new Date("2026-05-20T09:00:00.000"),
        new Date("2026-05-20T10:00:00.000"),
      ),
    );

    const next = repositionDraftByKeyboard({
      activity: "keyboardPlace",
      draft,
      key: "ArrowDown",
    });

    expect(dayjs(next?.values.schedule.start).format()).toBe(
      dayjs("2026-05-20T09:15:00.000").format(),
    );
  });
});
