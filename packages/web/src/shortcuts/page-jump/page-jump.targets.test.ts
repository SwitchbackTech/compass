import { PICK_KEY_LABELS } from "@web/shortcuts/digit-pick.util";
import {
  buildDayPageJumpTargets,
  CALENDAR_PAGE_JUMP_TARGETS,
  dayColumnJumpId,
  focusPageJumpTarget,
  getPageJumpFocusElement,
  LIFE_PAGE_JUMP_TARGETS,
  PAGE_JUMP_ATTRIBUTE,
  type PageJumpTargetId,
} from "@web/shortcuts/page-jump/page-jump.targets";
import { afterEach, describe, expect, it } from "bun:test";

const addAnchor = (id: PageJumpTargetId): HTMLElement => {
  const anchor = document.createElement("section");
  anchor.setAttribute(PAGE_JUMP_ATTRIBUTE, id);
  document.body.append(anchor);
  return anchor;
};

afterEach(() => {
  document.body.innerHTML = "";
});

describe.each([
  ["CALENDAR_PAGE_JUMP_TARGETS", CALENDAR_PAGE_JUMP_TARGETS],
  ["LIFE_PAGE_JUMP_TARGETS", LIFE_PAGE_JUMP_TARGETS],
])("%s", (_name, targets) => {
  it("assigns sequential digits matching each target's list position", () => {
    // usePageJumpShortcut resolves a pressed digit by index, so the digit
    // shown on a chip must always equal the physical top-row label.
    targets.forEach((target, index) => {
      expect(target.digit).toBe(PICK_KEY_LABELS[index]);
    });
  });
});

describe("buildDayPageJumpTargets", () => {
  it("appends writable columns after the shared 1-4 page areas", () => {
    const personal = { id: "cal-personal", name: "Personal" };
    const work = { id: "cal-work", name: "Work" };
    const targets = buildDayPageJumpTargets([personal, work]);

    expect(targets.slice(0, 4)).toEqual([...CALENDAR_PAGE_JUMP_TARGETS]);
    expect(targets[4]).toEqual({
      digit: "5",
      id: dayColumnJumpId(personal.id),
      label: "Personal",
    });
    expect(targets[5]).toEqual({
      digit: "6",
      id: dayColumnJumpId(work.id),
      label: "Work",
    });
  });

  it("keeps column digits at 5+ when earlier page areas would be unmounted", () => {
    const targets = buildDayPageJumpTargets([{ id: "cal-1", name: "Work" }]);
    expect(targets[4]?.digit).toBe("5");
  });

  it("omits calendars past the physical top-row keys", () => {
    const extraSlots =
      PICK_KEY_LABELS.length - CALENDAR_PAGE_JUMP_TARGETS.length;
    const calendars = Array.from({ length: extraSlots + 3 }, (_, index) => ({
      id: `cal-${index}`,
      name: `Calendar ${index}`,
    }));
    const targets = buildDayPageJumpTargets(calendars);

    expect(targets).toHaveLength(PICK_KEY_LABELS.length);
    expect(targets.at(-1)?.digit).toBe(PICK_KEY_LABELS.at(-1));
  });
});

describe("getPageJumpFocusElement", () => {
  it("returns null when the anchor is not mounted", () => {
    expect(getPageJumpFocusElement("month-picker")).toBeNull();
  });

  it("returns null when the anchor has nothing focusable", () => {
    // Matches the empty Up Next card: a section with only static text.
    const anchor = addAnchor("up-next");
    anchor.append(document.createTextNode("All clear"));

    expect(getPageJumpFocusElement("up-next")).toBeNull();
  });

  it("prefers an explicit tabindex=0 roving stop over earlier buttons", () => {
    // Mirrors the month picker: react-datepicker's prev/next buttons come
    // first in DOM order, but exactly one day keeps tabindex=0.
    const anchor = addAnchor("month-picker");
    const prevMonth = document.createElement("button");
    anchor.append(prevMonth);
    const day = document.createElement("div");
    day.setAttribute("tabindex", "0");
    anchor.append(day);

    expect(getPageJumpFocusElement("month-picker")).toBe(day);
  });

  it("falls back to the first interactive element", () => {
    const anchor = addAnchor("view-select");
    const disabled = document.createElement("button");
    disabled.disabled = true;
    anchor.append(disabled);
    const trigger = document.createElement("button");
    anchor.append(trigger);

    expect(getPageJumpFocusElement("view-select")).toBe(trigger);
  });
});

describe("focusPageJumpTarget", () => {
  it("focuses the resolved element and reports success", () => {
    const anchor = addAnchor("calendars");
    const toggle = document.createElement("button");
    anchor.append(toggle);

    expect(focusPageJumpTarget("calendars")).toBe(true);
    expect(document.activeElement).toBe(toggle);
  });

  it("reports failure when the target cannot take focus", () => {
    expect(focusPageJumpTarget("calendars")).toBe(false);
  });

  it("clicks a closed menu trigger so the dropdown opens", () => {
    const anchor = addAnchor("view-select");
    const trigger = document.createElement("button");
    trigger.setAttribute("aria-haspopup", "listbox");
    trigger.setAttribute("aria-expanded", "false");
    trigger.addEventListener("click", () => {
      trigger.setAttribute("aria-expanded", "true");
    });
    anchor.append(trigger);

    expect(focusPageJumpTarget("view-select")).toBe(true);
    expect(document.activeElement).toBe(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
  });

  it("does not click an already-open menu trigger", () => {
    const anchor = addAnchor("view-select");
    const trigger = document.createElement("button");
    trigger.setAttribute("aria-haspopup", "listbox");
    trigger.setAttribute("aria-expanded", "true");
    let clicks = 0;
    trigger.addEventListener("click", () => {
      clicks += 1;
    });
    anchor.append(trigger);

    expect(focusPageJumpTarget("view-select")).toBe(true);
    expect(clicks).toBe(0);
  });

  it("does not click a plain focusable control", () => {
    const anchor = addAnchor("calendars");
    const toggle = document.createElement("button");
    let clicks = 0;
    toggle.addEventListener("click", () => {
      clicks += 1;
    });
    anchor.append(toggle);

    expect(focusPageJumpTarget("calendars")).toBe(true);
    expect(clicks).toBe(0);
  });
});
